import { BaseModule } from '../base';
import fetch from 'node-fetch';
import { getLogger } from '../../core/logger';
import { CoinGeckoPrice } from './types';
import { CoinGeckoClient } from './client';
import { getConfig } from '../../core/config';

const logger = getLogger();

export class CoinGeckoModule extends BaseModule {
  private client: CoinGeckoClient;

  constructor() {
    super('COINGECKO', 'Handles CoinGecko price data', [
      'getPrices',
      'getMarketData',
      'getTokenInfo'
    ]);
    
    const config = getConfig();
    this.client = new CoinGeckoClient(config.coingeckoApiKey);
  }

  async execute(action: string, params: any): Promise<any> {
    switch (action) {
      case 'getPrices':
        return this.client.getPrice(params.coinId, params.vsCurrency);
      // ... other cases
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}
