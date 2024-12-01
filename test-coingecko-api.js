// test-coingecko-api.js

import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const coinId = 'bitcoin'; // Example
const vs_currency = 'usd';
const now = Math.floor(Date.now() / 1000);
const oneDayAgo = now - 24 * 60 * 60;

const url = `https://pro-api.coingecko.com/api/v3/coins/${coinId}/market_chart/range?vs_currency=${vs_currency}&from=${oneDayAgo}&to=${now}`;

const options = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'x-cg-pro-api-key': process.env.COINGECKO_API_KEY,
  },
};

fetch(url, options)
  .then(res => {
    console.log(`Status: ${res.status} ${res.statusText}`);
    return res.json();
  })
  .then(json => console.log(JSON.stringify(json, null, 2)))
  .catch(err => console.error('Error:', err));
