import dotenv from 'dotenv';
import { getLogger } from './logger';
import path from 'path';

const logger = getLogger();

// Load environment variables from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface Config {
  openaiApiKey: string;
  replicateApiKey: string;
  pinata: {
    apiKey: string;
    secretKey: string;
    gateway?: string;
  };
  coingeckoApiKey?: string;
  // ... other config options
}

export function getConfig(): Config {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    replicateApiKey: process.env.REPLICATE_API_KEY || '',
    pinata: {
      apiKey: process.env.PINATA_API_KEY || '',
      secretKey: process.env.PINATA_SECRET_KEY || '',
      gateway: process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'
    },
    coingeckoApiKey: process.env.COINGECKO_API_KEY
    // ... other config options
  };
}

export function getReplicateToken(): string {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
        logger.error('REPLICATE_API_TOKEN not found in environment variables');
        throw new Error('REPLICATE_API_TOKEN is required');
    }
    return token;
}

export function getUsername(): string {
    return process.env.PROTON_ACCOUNT || '';
}

// Add more config getters as needed 