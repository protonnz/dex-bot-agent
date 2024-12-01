// test-get-crypto-data.js

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generateDataString } from './src/get-crypto-data.js';

// Handle __dirname and __filename in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// ***** Configuration *****

// Your Proton account username
const USERNAME = process.env.PROTON_USERNAME;

// Allowed markets to trade
const ALLOWED_MARKETS = [
  'XBTC_XMD',
  'XETH_XMD',
  'XPR_XMD',
  'XMT_XMD',
  'XDOGE_XMD',
  'XXRP_XMD',
  'METAL_XMD',
  'XLTC_XMD',
];

/**
 * Formats a timestamp to 'YYYY-MM-DD'.
 * @param {string} timestamp - The original timestamp.
 * @returns {string} - Formatted date string.
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (`0${date.getMonth() + 1}`).slice(-2); // Months are zero-based
  const day = (`0${date.getDate()}`).slice(-2);
  return `${year}-${month}-${day}`;
}

/**
 * Test function to generate and inspect dataString.
 */
async function testGenerateDataString() {
  // Open the SQLite Database
  const db = await open({
    filename: path.join(__dirname, 'agent.db'),
    driver: sqlite3.Database,
  });

  try {
    // Assign username to db if required by get-crypto-data.js
    db.username = USERNAME;

    // Generate the data string
    const dataObject = await generateDataString(db, ALLOWED_MARKETS);

    // Convert to JSON string with indentation
    const dataString = JSON.stringify(dataObject, null, 2);

    // Write to dataString.txt
    const outputPath = path.join(__dirname, 'dataString.txt');
    fs.writeFileSync(outputPath, dataString, 'utf8');

    console.log(`Data string successfully written to ${outputPath}`);
  } catch (error) {
    console.error(`Error generating data string: ${error.message}`);
  } finally {
    await db.close();
  }
}

testGenerateDataString();
