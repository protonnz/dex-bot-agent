import dotenv from 'dotenv';
import { getLogger } from './logger';
import path from 'path';

const logger = getLogger();

// Load environment variables from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface Config {
  api: {
    endpoint: string;
    account: string;
  };
  modules: {
    image: {
      model: string;
      tempDir: string;
      pinataApiKey: string;
      pinataSecretKey: string;
    };
  };
  coingeckoApiKey: string;
}

export function getConfig(): Config {
  return {
    api: {
      endpoint: process.env.API_ENDPOINT || '',
      account: process.env.PROTON_USERNAME || '',
    },
    modules: {
      image: {
        model: process.env.IMAGE_MODEL || '',
        tempDir: process.env.TEMP_DIR || './temp',
        pinataApiKey: process.env.PINATA_API_KEY || '',
        pinataSecretKey: process.env.PINATA_SECRET_KEY || '',
      },
    },
    coingeckoApiKey: process.env.COINGECKO_API_KEY || '',
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