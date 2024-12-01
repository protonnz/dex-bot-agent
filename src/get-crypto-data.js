// src/get-crypto-data.js

import fs from 'fs';
import path from 'path';
import BigNumber from 'bignumber.js';
import fetch from 'node-fetch';

/**
 * Rounds all numerical values in an object to four decimal places.
 * @param {Object|Array|number} obj - The object to round.
 * @returns {Object|Array|number} - The rounded object.
 */
function roundNumbers(obj) {
  if (typeof obj === 'number') {
    return parseFloat(obj.toFixed(4));
  } else if (Array.isArray(obj)) {
    return obj.map(item => roundNumbers(item));
  } else if (typeof obj === 'object' && obj !== null) {
    const roundedObj = {};
    for (const [key, value] of Object.entries(obj)) {
      roundedObj[key] = roundNumbers(value);
    }
    return roundedObj;
  }
  return obj;
}

/**
 * Fetches recent trades from the DEX API.
 * @param {string} username - The Proton account username.
 * @param {Array<string>} allowedMarkets - List of allowed market symbols.
 * @returns {Array<Object>} - Array of recent trades.
 */
async function fetchRecentTrades(username, allowedMarkets) {
  const recentTrades = [];

  for (const marketSymbol of allowedMarkets) {
    const url = `https://dex.api.mainnet.metalx.com/dex/v1/trades/history?account=${username}&symbol=${marketSymbol}&offset=0&limit=10`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && data.data) {
      recentTrades.push({
        market: marketSymbol,
        trades: data.data.map(trade => ({
          timestamp: trade.timestamp, // Assuming 'timestamp' is already human-readable
          side: trade.side,
          price: trade.price,
          amount: trade.amount,
        })),
      });
    }
  }

  return recentTrades;
}

/**
 * Calculates the total portfolio value in XMD.
 * @param {Object} db - The SQLite database instance.
 * @returns {number} - Total portfolio value in XMD.
 */
async function calculatePortfolioValue(db) {
  const balances = await db.all(
    `SELECT * FROM balances ORDER BY timestamp DESC`
  );

  let totalValueXMD = 0;

  for (const balance of balances) {
    const tokenCode = balance.token_code;
    const amount = parseFloat(balance.balance);

    if (tokenCode === 'XMD') {
      totalValueXMD += amount;
    } else {
      // Get the latest price of the token in USD
      const marketSymbol = `${tokenCode}_USD`; // Update symbol to match USD
      const marketData = await db.get(
        `SELECT * FROM market_data WHERE symbol = ? ORDER BY timestamp DESC LIMIT 1`,
        [marketSymbol]
      );

      if (marketData) {
        const price = marketData.close;
        totalValueXMD += amount * price;
      }
      // If market data is not available, skip
    }
  }

  // Round the total portfolio value to four decimal places
  totalValueXMD = parseFloat(totalValueXMD.toFixed(4));

  return totalValueXMD;
}

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
 * Generates the data string by fetching the latest data from the database.
 * @param {Object} db - The SQLite database instance.
 * @param {Array<string>} allowedMarkets - List of allowed market symbols.
 * @returns {Object} - The rounded and simplified data object.
 */
async function generateDataString(db, allowedMarkets) {
  // Get the latest market data for all markets
  const marketData = await db.all(
    `SELECT symbol, close, timestamp FROM market_data WHERE symbol IN (${allowedMarkets.map(() => '?').join(',')}) ORDER BY timestamp DESC`,
    allowedMarkets
  );

  // Simplify marketData: only "close" price and date-only timestamp
  const simplifiedMarketData = marketData.map(item => ({
    symbol: item.symbol,
    close: item.close,
    date: formatDate(item.timestamp),
  }));

  // Get historical hourly prices for each market
  const historicalHourlyData = {};

  for (const marketSymbol of allowedMarkets) {
    const prices = await db.all(
      `SELECT close, timestamp FROM historical_prices WHERE market_symbol = ? AND LENGTH(timestamp) > 10 ORDER BY timestamp DESC LIMIT 24`,
      [marketSymbol]
    );

    if (prices.length > 0) {
      // Group prices by date
      const groupedByDate = {};

      prices.forEach(price => {
        const date = formatDate(price.timestamp);
        const hour = new Date(price.timestamp).getHours(); // 0 to 23
        if (!groupedByDate[date]) {
          groupedByDate[date] = {};
        }
        groupedByDate[date][hour] = price.close;
      });

      // Format as per user's requirement
      historicalHourlyData[marketSymbol] = Object.entries(groupedByDate).map(([date, hours]) => {
        const hourlyPrices = [];
        for (let hour = 0; hour < 24; hour++) {
          const price = hours[hour] !== undefined ? `$${priceFormat(hours[hour])}` : '';
          hourlyPrices.push({
            hour: hour.toString().padStart(2, '0'),
            price: price,
          });
        }
        return {
          date: formatDate(date),
          hourlyPrices,
        };
      });
    }
  }

  // Assemble all data
  const dataToPrint = {
    marketData: simplifiedMarketData,
    historicalHourlyData,
  };

  // Round all decimals to four decimal places
  const roundedDataToPrint = roundNumbers(dataToPrint);

  return roundedDataToPrint;
}

/**
 * Formats a number to two decimal places with a dollar sign.
 * @param {number} num - The number to format.
 * @returns {string} - Formatted price string.
 */
function priceFormat(num) {
  return num.toFixed(2);
}

export { generateDataString };
