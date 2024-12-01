import { JsonRpc, Api } from '@proton/js';
import { JsSignatureProvider } from '@proton/js';
import { getLogger } from './logger';

const logger = getLogger();

const ENDPOINTS = {
  rpc: 'https://api-xprnetwork-main.saltant.io',
  atomic: 'https://aa-xprnetwork-main.saltant.io'
};

export async function initializeApi() {
  try {
    logger.info(`Connecting to RPC endpoint: ${ENDPOINTS.rpc}`);
    const rpc = new JsonRpc(ENDPOINTS.rpc);
    
    // For read-only operations, we don't need a signature provider
    const api = new Api({ 
      rpc,
      // Only add signatureProvider if we have a private key and need to submit transactions
      ...(process.env.PROTON_PRIVATE_KEY ? {
        signatureProvider: new JsSignatureProvider([process.env.PROTON_PRIVATE_KEY])
      } : {})
    });

    logger.info('API initialized in read-only mode');
    return { api, rpc };
  } catch (err) {
    const error = err as Error;
    logger.error(`Failed to initialize API: ${error.message}`);
    throw error;
  }
}

export class ProtonClient {
    // Implementation details
    getAccount(): string {
        // Implementation
        return '';
    }

    async transact(params: any): Promise<any> {
        // Implementation
        return {};
    }
} 