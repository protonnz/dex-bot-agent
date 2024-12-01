import dotenv from 'dotenv';
import { getLogger } from './logger';
import path from 'path';

const logger = getLogger();

// Load environment variables from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface Config {
  rpcEndpoint: string;
  privateKey: string;
  account: string;
  coingeckoApiKey: string;
}

export function getConfig(): Config {
  return {
    rpcEndpoint: process.env.API_ENDPOINT || '',
    privateKey: process.env.PROTON_PRIVATE_KEY || '',
    account: process.env.PROTON_USERNAME || '',
    coingeckoApiKey: process.env.COINGECKO_API_KEY || ''
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