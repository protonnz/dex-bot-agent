import { JsonRpc, Api, JsSignatureProvider } from '@proton/js';
import { getConfig } from './config';
import dotenv from 'dotenv';
import { getLogger } from '../core/logger';

const logger = getLogger();

// Load environment variables
dotenv.config();

export async function initializeProtonApi() {
  const config = getConfig();
  const privateKey = process.env.PROTON_PRIVATE_KEY;
  const username = process.env.PROTON_USERNAME;

  logger.info(`Initializing Proton API for user: ${username}`);
  
  if (!privateKey) {
    throw new Error('PROTON_PRIVATE_KEY environment variable is not set');
  }

  if (!username) {
    throw new Error('PROTON_USERNAME environment variable is not set');
  }

  try {
    logger.info('Connecting to endpoint: ' + config.rpc.endpoints[0]);
    const rpc = new JsonRpc(config.rpc.endpoints[0]);
    
    logger.info('Setting up signature provider...');
    const signatureProvider = new JsSignatureProvider([privateKey]);
    
    logger.info('Initializing API...');
    const api = new Api({
      rpc,
      signatureProvider,
    });

    return { api, rpc };
  } catch (err) {
    const error = err as Error;
    logger.error(`Failed to initialize Proton API: ${error.message}`);
    throw error;
  }
}
