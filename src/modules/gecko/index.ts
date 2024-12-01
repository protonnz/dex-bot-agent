import { BaseModule, ModuleAction } from '../base';
import fetch from 'node-fetch';
import { getLogger } from '../../core/logger';
import { CoinGeckoPrice } from './types';

const logger = getLogger();

export class GeckoModule extends BaseModule {
  private apiKey: string;
  private baseUrl = 'https://pro-api.coingecko.com/api/v3';

  constructor(apiKey: string) {
    super(
      'GECKO',
      'CoinGecko price and market data integration',
      [
        'Get current prices',
        'Get historical prices',
        'Get market data',
        'Track price changes'
      ]
    );
    this.apiKey = apiKey;
  }

  async execute(action: string, params: Record<string, any>): Promise<ModuleAction> {
    const timestamp = Date.now();
    try {
      switch (action) {
        case 'getPrice': {
          const response = await fetch(
            `${this.baseUrl}/simple/price?ids=proton&vs_currencies=usd&include_24hr_change=true&x_cg_pro_api_key=${this.apiKey}`
          );
          
          if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.statusText}`);
          }

          const data = await response.json() as CoinGeckoPrice;
          logger.info(`Current XPR price: $${data.proton.usd}`);
          
          return {
            type: action,
            params,
            timestamp,
            success: true,
            data: {
              price: data.proton.usd,
              change24h: data.proton.usd_24h_change
            }
          };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (err) {
      const error = err as Error;
      logger.error(`GeckoModule error: ${error.message}`);
      return {
        type: action,
        params,
        timestamp,
        success: false,
        error: error.message
      };
    }
  }
}
