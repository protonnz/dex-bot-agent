import { ClobClient } from "@polymarket/clob-client";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// Get environment variables
const host = process.env.CLOB_API_URL || "http://localhost:8080";
const signer = new ethers.Wallet(`${process.env.PK}`);
const creds = {
  key: `${process.env.CLOB_API_KEY}`,
  secret: `${process.env.CLOB_SECRET}`,
  passphrase: `${process.env.CLOB_PASS_PHRASE}`,
};

// Initialize the clob client
const clobClient = new ClobClient(host, signer, creds);

// Function to list all current markets
async function listCurrentMarkets() {
  try {
    // Assuming there's a method in the clobClient to list the markets, let's call it
    const markets = await clobClient.getMarkets();
    
    // If markets are returned, display them
    if (markets && markets.length > 0) {
      console.log("Current Polymarket Markets:");
      markets.forEach((market, index) => {
        console.log(`${index + 1}. Market ID: ${market.id}, Market Name: ${market.name}, Status: ${market.status}`);
      });
    } else {
      console.log("No markets found.");
    }
  } catch (error) {
    console.error("Error fetching current markets:", error);
  }
}

// Execute the function
listCurrentMarkets();
