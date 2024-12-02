import { JsonRpc, Api } from '@proton/js';
import { JsSignatureProvider } from '@proton/js';
import { getLogger } from './logger';

const logger = getLogger();

export class ProtonClient {
  private rpc: JsonRpc;
  private api: Api;
  private account: string;

  constructor() {
    if (!process.env.PROTON_USERNAME || !process.env.PROTON_PRIVATE_KEY) {
      throw new Error('Missing PROTON_USERNAME or PROTON_PRIVATE_KEY in environment');
    }

    this.account = process.env.PROTON_USERNAME;
    logger.info(`Initializing Proton API for user: ${this.account}`);
    
    // Initialize RPC and API
    logger.info('Connecting to endpoint: https://rpc.api.mainnet.metalx.com');
    this.rpc = new JsonRpc('https://rpc.api.mainnet.metalx.com');
    
    logger.info('Setting up signature provider...');
    this.api = new Api({
      rpc: this.rpc,
      signatureProvider: new JsSignatureProvider([process.env.PROTON_PRIVATE_KEY])
    });
  }

  public getApi(): Api {
    return this.api;
  }

  getAccount(): string {
    return this.account;
  }

  async transact(params: any): Promise<any> {
    return await this.api.transact(params, {
      blocksBehind: 300,
      expireSeconds: 3000
    });
  }

  public async getTransaction(txid: string) {
    return await this.api.rpc.history_get_transaction(txid);
  }
} 