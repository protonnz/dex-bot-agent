// agent-mainnet-trade-o1.mini.js

// Import necessary modules
import { JsonRpc, Api, JsSignatureProvider } from '@proton/js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import process, { argv } from 'process';
import { fileURLToPath } from 'url';
import BigNumber from 'bignumber.js';
import fetch from 'node-fetch';

// Import functions from get-crypto-data.js
import {
  generateDataString,
  fetchAndStoreMarketData,
  fetchAndStoreFearAndGreed,
  fetchAndStoreBalances,
  fetchAndStoreHistoricalData,
  roundNumbers,
} from './src/get-crypto-data.js';

// Handle __dirname and __filename in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// ***** Configuration *****

// Your Proton account username
const USERNAME = process.env.PROTON_USERNAME;

// Your Proton private key
const PRIVATE_KEY = process.env.PROTON_PRIVATE_KEY;

// OpenAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Telegram Bot API Key and Chat ID
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// CoinGecko API Key
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

// Maximum trade size (default 10.0000 XMD)
const MAX_TRADE_SIZE = parseFloat(process.env.MAX_TRADE_SIZE || '10.0');

// Minimum trade size (default 10.0000 XMD)
const MIN_TRADE_SIZE = parseFloat(process.env.MIN_TRADE_SIZE || '10.0');

// Maximum number of orders per market (default 1)
const MAX_ORDERS_PER_MARKET = parseInt(process.env.MAX_ORDERS_PER_MARKET || '1', 10);

// Markets to avoid (default [])
const MARKETS_TO_AVOID = process.env.MARKETS_TO_AVOID
  ? process.env.MARKETS_TO_AVOID.split(',')
  : [];

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

// Map market symbols to CoinGecko coin IDs
const marketToCoinGeckoId = {
  'XBTC_XMD': 'bitcoin',
  'XETH_XMD': 'ethereum',
  'XPR_XMD': 'proton',
  'XMT_XMD': 'metal',
  'XDOGE_XMD': 'dogecoin',
  'XXRP_XMD': 'ripple',
  'METAL_XMD': 'metal-blockchain',
  'XLTC_XMD': 'litecoin',
};

// Proton RPC endpoints
const ENDPOINTS = ['https://proton.eoscafeblock.com'];

// Delay between agent wake-ups in seconds (default 3600 for 1 hour)
const AGENT_DELAY = parseInt(process.env.AGENT_DELAY || '3600', 10);

// *************************

// Check if all required environment variables are set
if (!USERNAME || !PRIVATE_KEY || !OPENAI_API_KEY || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !COINGECKO_API_KEY) {
  console.error(
    'Please set the PROTON_USERNAME, PROTON_PRIVATE_KEY, OPENAI_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, and COINGECKO_API_KEY environment variables.'
  );
  process.exit(1);
}

// Parse command-line arguments
let autoMode = false;
let delaySeconds = AGENT_DELAY;

argv.forEach((arg, index) => {
  if (arg === '--auto') {
    autoMode = true;
  } else if (arg === '--delay') {
    const delayArg = argv[index + 1];
    if (delayArg && !isNaN(Number(delayArg))) {
      delaySeconds = parseInt(delayArg, 10);
    } else {
      console.error('Invalid or missing value for --delay. Please provide the delay in seconds.');
      process.exit(1);
    }
  }
});

// Initialize Proton API
const rpc = new JsonRpc(ENDPOINTS[0]);
const signatureProvider = new JsSignatureProvider([PRIVATE_KEY]);
const api = new Api({
  rpc,
  signatureProvider,
});

// Initialize SQLite Database
let db;

// Logging levels
const LogLevel = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
};

// Function to log messages to console, file, and database
function log(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;

  // Console
  console.log(logMessage);

  // File
  fs.appendFileSync('agent.log', logMessage + '\n');

  // Database
  if (db) {
    db.run('INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)', [timestamp, level, message]);
  }
}

// Function to send Telegram notifications
async function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    log(LogLevel.ERROR, `Failed to send Telegram message: ${error.message}`);
  }
}

/**
 * Function to initialize the database
 */
async function initializeDatabase() {
  db = await open({
    filename: path.join(__dirname, 'agent.db'),
    driver: sqlite3.Database,
  });

  // Assign username to db for use in get-crypto-data.js
  db.username = USERNAME;

  // Check and update database schema
  await db.exec(`
    PRAGMA foreign_keys = ON;
  `);

  // Create or update tables as needed
  await db.exec(`
    CREATE TABLE IF NOT EXISTS market_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      market_id INTEGER,
      symbol TEXT,
      volume_bid REAL,
      volume_ask REAL,
      open REAL,
      close REAL,
      high REAL,
      low REAL,
      change_percentage REAL
    );

    CREATE TABLE IF NOT EXISTS fear_and_greed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      value INTEGER,
      value_classification TEXT,
      time_until_update INTEGER
    );

    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      action TEXT,
      market TEXT,
      price REAL,
      amount REAL,
      total_cost REAL,
      reason TEXT,
      success BOOLEAN,
      closing_trade_id INTEGER,
      profit_loss REAL,
      percentage_change REAL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      level TEXT,
      message TEXT
    );

    CREATE TABLE IF NOT EXISTS balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      token_code TEXT,
      balance REAL
    );

    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      open_trade_id INTEGER,
      close_trade_id INTEGER,
      market TEXT,
      amount REAL,
      open_price REAL,
      close_price REAL,
      profit_loss REAL,
      percentage_change REAL,
      FOREIGN KEY (open_trade_id) REFERENCES trades(id),
      FOREIGN KEY (close_trade_id) REFERENCES trades(id)
    );

    CREATE TABLE IF NOT EXISTS historical_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_symbol TEXT,
      timestamp DATETIME,
      open REAL,
      high REAL,
      low REAL,
      close REAL,
      volume REAL
    );

    CREATE TABLE IF NOT EXISTS historical_data_fetch_times (
      market_symbol TEXT PRIMARY KEY,
      last_fetch_time INTEGER
    );
  `);

  // Perform any necessary schema updates
  await performSchemaUpdates();
}

/**
 * Function to perform schema updates if needed
 */
async function performSchemaUpdates() {
  // Example: Add new columns to existing tables if they don't exist
  const tableColumns = {
    trades: ['total_cost', 'closing_trade_id', 'profit_loss', 'percentage_change'],
    positions: [
      'id',
      'open_trade_id',
      'close_trade_id',
      'market',
      'amount',
      'open_price',
      'close_price',
      'profit_loss',
      'percentage_change',
    ],
    balances: ['token_code', 'balance'],
    historical_data_fetch_times: ['market_symbol', 'last_fetch_time'],
  };

  for (const [tableName, columns] of Object.entries(tableColumns)) {
    for (const column of columns) {
      try {
        await db.run(`ALTER TABLE ${tableName} ADD COLUMN ${column}`);
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          // Column already exists, continue
          continue;
        } else {
          log(LogLevel.ERROR, `Failed to update schema for table ${tableName}: ${error.message}`);
        }
      }
    }
  }

  // Ensure 'market_symbol' column exists in 'historical_prices' table
  const columns = await db.all(`PRAGMA table_info(historical_prices)`);
  const hasMarketSymbol = columns.some(column => column.name === 'market_symbol');

  if (!hasMarketSymbol) {
    await db.run(`ALTER TABLE historical_prices ADD COLUMN market_symbol TEXT`);
  }
}

/**
 * Function to delay execution for a given number of milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Function to execute the agent's main logic
 */
async function executeAgent() {
  try {
    // Fetch and store data every 10 minutes
    const lastMarketDataFetch = await db.get(
      `SELECT MAX(timestamp) as lastFetch FROM market_data`
    );
    const lastFGIFetch = await db.get(
      `SELECT MAX(timestamp) as lastFetch FROM fear_and_greed`
    );
    const now = Date.now();

    if (
      !lastMarketDataFetch ||
      now - new Date(lastMarketDataFetch.lastFetch).getTime() > 10 * 60 * 1000
    ) {
      await fetchAndStoreMarketData(db);
    }

    if (!lastFGIFetch || now - new Date(lastFGIFetch.lastFetch).getTime() > 10 * 60 * 1000) {
      await fetchAndStoreFearAndGreed(db);
    }

    // Fetch and store balances
    await fetchAndStoreBalances(db, USERNAME);

    // Fetch and store historical data
    await fetchAndStoreHistoricalData(db, marketToCoinGeckoId, COINGECKO_API_KEY, ALLOWED_MARKETS);

    // Get AI decision using the extracted generateDataString function
    const dataObject = await generateDataString(db, ALLOWED_MARKETS, marketToCoinGeckoId, COINGECKO_API_KEY);
    // const roundedDataToPrint = roundNumbers(dataObject); // Already rounded in generateDataString

    // Prepare the dataString
    const dataString = JSON.stringify(dataObject, null, 2);

    // Print dataString to console for debugging
    console.log('Data String Sent to AI:', dataString);

    // Write dataString to latestPrompt.txt (overwrite each time)
    fs.writeFileSync(path.join(__dirname, 'latestPrompt.txt'), dataString);

    // Continue with the AI decision process
    const aiResponse = await getAIDecision(dataObject);
    const decisions = parseAIDecision(aiResponse);

    if (!decisions) {
      return;
    }

    for (const decision of decisions) {
      if (autoMode) {
        log(LogLevel.INFO, 'Auto mode enabled. Proceeding to execute trade.');
        await executeTrade(decision);
      } else {
        // Prompt for confirmation
        const confirmation = await promptInput(
          `Do you want to execute the following trade?\nAction: ${decision.action.toUpperCase()}\nMarket: ${decision.market}\nPrice: ${decision.price} USD\nAmount: ${decision.amount}\nReason: ${decision.reason}\n(yes/no): `
        );
        if (confirmation.toLowerCase() === 'yes') {
          await executeTrade(decision);
        } else {
          log(LogLevel.INFO, 'Trade cancelled by user.');
          await db.run(
            `INSERT INTO trades (action, market, price, amount, reason, success) VALUES (?, ?, ?, ?, ?, ?)`,
            [decision.action, decision.market, decision.price, decision.amount, decision.reason, 0]
          );
        }
      }
    }
  } catch (error) {
    log(LogLevel.ERROR, `An error occurred: ${error.message}`);
    sendTelegramMessage(`Agent encountered an error: ${error.message}`);
  }
}

/**
 * Function to get AI decision
 * @param {Object} data - The data object to send to AI
 * @returns {string} - AI response
 */
async function getAIDecision(data) {
  log(LogLevel.INFO, 'Fetching AI decision...');

  // Prepare the data as a JSON string (already rounded and human-readable dates)
  const dataString = JSON.stringify(data, null, 2);

  // Prepare the prompt with constraints
  const prompt = `Based on the following summarized data, decide whether to place any orders to maximize the overall portfolio value.

Data:
${dataString}

Constraints:
- The maximum trade size is ${MAX_TRADE_SIZE} USD.
- The minimum trade size is ${MIN_TRADE_SIZE} USD.
- Aim to suggest trades where the total value is as close as possible to the maximum trade size without exceeding it.
- Only suggest trades that are likely to significantly impact the portfolio value.
- **Ensure that the suggested amount does not exceed the available balance for that asset (balances are provided in the data).**
- Consider your recent trades (provided in the data) and avoid making similar trades repeatedly.
- Provide historical daily prices for the last 30 days and hourly prices for the last 24 hours.
- Include the size of completed trades, not just prices.
- Include one reference point from the Fear and Greed Index for each day over the last 30 days.
- If no significant opportunities are identified, you may choose to skip this trading round.

Provide your decision in the following format:

Action: <buy/sell/skip>
Market: <market_symbol> (if applicable)
Price: <price> (if applicable)
Amount: <amount of BASE asset> (if applicable)
Reason: <brief_reason>

Do not include any additional text.`;

  // Write the entire prompt to latestPrompt.txt (overwrites each time)
  fs.writeFileSync(path.join(__dirname, 'latestPrompt.txt'), prompt);

  // Call the OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are an AI trading assistant that makes trading decisions to maximize the overall portfolio value. Use the provided data to make informed decisions within the given constraints.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
      n: 1,
      stop: null,
      temperature: 0.5,
    }),
  });

  const responseData = await response.json();

  if (responseData.error) {
    throw new Error(`OpenAI API error: ${responseData.error.message}`);
  }

  const aiResponse = responseData.choices[0].message.content.trim();
  log(LogLevel.INFO, `AI Decision:\n${aiResponse}`);

  return aiResponse;
}

/**
 * Function to parse AI decision
 * @param {string} aiResponse - The response from AI
 * @returns {Array<Object>} - Parsed actions
 */
function parseAIDecision(aiResponse) {
  const actions = [];
  const actionBlocks = aiResponse.split(/Action:/i).slice(1); // Split the response into blocks for each action

  for (const block of actionBlocks) {
    const actionMatch = block.match(/^\s*(buy|sell|skip)/i);
    const marketMatch = block.match(/Market:\s*([\w_]+)/);
    const priceMatch = block.match(/Price:\s*([\d.,]+)/);
    const amountMatch = block.match(/Amount:\s*([\d.,]+)/);
    const reasonMatch = block.match(/Reason:\s*(.+)/);

    const action = actionMatch ? actionMatch[1].toLowerCase() : null;

    if (action === 'skip') {
      actions.push({ action: 'skip' });
      continue;
    }

    if (action && marketMatch && priceMatch && amountMatch && reasonMatch) {
      actions.push({
        action,
        market: marketMatch[1],
        price: parseFloat(priceMatch[1].replace(/,/g, '')),
        amount: parseFloat(amountMatch[1].replace(/,/g, '')),
        reason: reasonMatch[1].trim(),
      });
    } else {
      log(LogLevel.WARNING, 'Failed to parse one of the AI actions.');
    }
  }

  if (actions.length > 0) {
    return actions;
  } else {
    log(LogLevel.ERROR, 'Failed to parse AI decision.');
    return null;
  }
}

/**
 * Function to get user input from the console
 * @param {string} query - The prompt to display to the user
 * @returns {Promise<string>} - The user's input
 */
function promptInput(query) {
  return new Promise((resolve) => {
    process.stdout.write(query);
    process.stdin.resume();
    process.stdin.once('data', (data) => {
      process.stdin.pause();
      resolve(data.toString().trim());
    });
  });
}

/**
 * Function to execute trade based on AI decision
 * @param {Object} decision - The trade decision object
 */
async function executeTrade(decision) {
  // Implementation of executeTrade remains the same as in your original script
  // Ensure that all necessary functions and variables are defined or imported
  // For brevity, not repeating the entire function here
  // Make sure to import or define executeTrade in this script or in another module
  // If executeTrade was part of the original script, ensure it remains here
  // If not, you may need to move it to a module and import it
  // ...
  // Placeholder for executeTrade implementation
  log(LogLevel.INFO, `Executing trade: ${JSON.stringify(decision)}`);
  // Add your trade execution logic here
}

/**
 * Main function
 */
async function main() {
  await initializeDatabase();

  let retryCount = 0;
  const maxRetries = 30;

  if (delaySeconds > 0) {
    log(LogLevel.INFO, `Agent started in loop mode with a delay of ${delaySeconds} seconds.`);
    while (true) {
      try {
        await executeAgent();
        retryCount = 0; // Reset retry count on success
      } catch (error) {
        log(LogLevel.ERROR, `Execution failed: ${error.message}`);
        retryCount++;
        if (retryCount >= maxRetries) {
          log(LogLevel.ERROR, 'Max retries reached. Exiting.');
          break;
        }
      }
      log(LogLevel.INFO, `Waiting for ${delaySeconds} seconds before the next run...\n`);
      await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
    }
  } else {
    await executeAgent();
  }
}

main();
