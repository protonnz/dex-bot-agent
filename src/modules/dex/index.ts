import { BaseModule, ModuleAction } from '../base';
import { JsonRpc, Api } from '@proton/js';
import { getLogger } from '../../core/logger';
import { OrderParams, OrderData, DexTransactionResult } from './types';
import { getUsername } from '../../utils/config';
import { ORDERTYPES, ORDERSIDES, FILLTYPES } from '../../core/constants';
import * as dexapi from '../../dexapi';
import { BigNumber } from 'bignumber.js';

const logger = getLogger();
const EXPLORER_URL = 'https://explorer.xprnetwork.org/transaction';

export class DexModule extends BaseModule {
  private api: Api;
  private rpc: JsonRpc;
  private username: string;

  constructor(api: Api, rpc: JsonRpc) {
    super(
      'DEX',
      'Handles all DEX-related operations on Metal X',
      [
        'Place limit orders',
        'Cancel orders',
        'Check order status',
        'View market prices'
      ]
    );
    this.api = api;
    this.rpc = rpc;
    this.username = getUsername();
    this.initialize();
  }

  private async initialize() {
    try {
      logger.info('Initializing DEX markets...');
      await dexapi.initialize(); // This will fetch and store all markets
      logger.info('DEX markets initialized successfully');
    } catch (err) {
      const error = err as Error;
      logger.error(`Failed to initialize DEX markets: ${error.message}`);
      throw error;
    }
  }

  private async placeOrderOnChain(orderData: OrderData): Promise<DexTransactionResult> {
    try {
      const market = dexapi.getMarketBySymbol(orderData.market);
      if (!market) {
        throw new Error(`No market found by symbol ${orderData.market}`);
      }

      const maxQuantity = 5;
      const safeQuantity = Math.min(orderData.quantity, maxQuantity);

      const askToken = market.ask_token;
      const bidToken = market.bid_token;
      const side = orderData.side.toUpperCase() === 'BUY' ? ORDERSIDES.BUY : ORDERSIDES.SELL;

      const bnQuantity = new BigNumber(safeQuantity);
      const quantityText = side === ORDERSIDES.SELL
        ? `${bnQuantity.toFixed(bidToken.precision)} ${bidToken.code}`
        : `${bnQuantity.toFixed(askToken.precision)} ${askToken.code}`;

      logger.info(`Placing ${side === ORDERSIDES.SELL ? 'sell' : 'buy'} order for ${quantityText} at ${orderData.price}`);

      const quantityNormalized = side === ORDERSIDES.SELL
        ? new BigNumber(safeQuantity).times(Math.pow(10, bidToken.precision)).integerValue().toString()
        : new BigNumber(safeQuantity).times(Math.pow(10, askToken.precision)).integerValue().toString();

      const priceScaleFactor = Math.pow(10, bidToken.precision);
      const priceNormalized = new BigNumber(orderData.price || 0)
        .times(priceScaleFactor)
        .integerValue()
        .toString();

      logger.info(`Normalizing price ${orderData.price} to ${priceNormalized} (scale factor: ${priceScaleFactor})`);

      const stopPriceNormalized = "0";

      const actions = [{
        account: side === ORDERSIDES.SELL ? bidToken.contract : askToken.contract,
        name: 'transfer',
        data: {
          from: this.username,
          to: 'dex',
          quantity: quantityText,
          memo: '',
        },
        authorization: [{
          actor: this.username,
          permission: 'active',
        }],
      },
      {
        account: 'dex',
        name: 'placeorder',
        data: {
          market_id: market.market_id,
          account: this.username,
          order_type: ORDERTYPES.LIMIT,
          order_side: side,
          quantity: quantityNormalized,
          price: priceNormalized,
          bid_symbol: {
            sym: `${bidToken.precision},${bidToken.code}`,
            contract: bidToken.contract,
          },
          ask_symbol: {
            sym: `${askToken.precision},${askToken.code}`,
            contract: askToken.contract,
          },
          trigger_price: stopPriceNormalized,
          fill_type: FILLTYPES.GTC,
          referrer: '',
        },
        authorization: [{
          actor: this.username,
          permission: 'active',
        }],
      }];

      const result = await this.api.transact(
        { actions },
        {
          blocksBehind: 3,
          expireSeconds: 30,
        }
      ) as DexTransactionResult;

      if (result.transaction_id) {
        const txUrl = `${EXPLORER_URL}/${result.transaction_id}`;
        logger.info(`Transaction submitted: ${txUrl}`);
      }

      return result;
    } catch (err) {
      const error = err as Error;
      logger.error(`Failed to place order: ${error.message}`);
      throw error;
    }
  }

  async execute(action: string, params: Record<string, any>): Promise<ModuleAction> {
    const timestamp = Date.now();
    try {
      switch (action) {
        case 'placeOrder': {
          const orderParams = params as OrderParams;
          logger.info(`Placing ${orderParams.type} ${orderParams.side} order for ${orderParams.marketSymbol}`);
          
          const orderData: OrderData = {
            account: this.username,
            market: orderParams.marketSymbol,
            market_id: orderParams.market_id,
            side: orderParams.side,
            type: orderParams.type,
            quantity: orderParams.quantity,
            price: orderParams.price,
            stopPrice: orderParams.stopPrice,
            fillType: (orderParams.fillType || 'GTC') as keyof typeof FILLTYPES
          };

          const result = await this.placeOrderOnChain(orderData);
          
          const response: ModuleAction = {
            type: action,
            params: orderParams,
            timestamp,
            success: true,
            data: {
              ...result,
              explorerUrl: result.transaction_id ? 
                `${EXPLORER_URL}/${result.transaction_id}` : 
                undefined
            }
          };

          return response;
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (err) {
      const error = err as Error;
      logger.error(`DEX error: ${error.message}`);
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
