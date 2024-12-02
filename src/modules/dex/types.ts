import { BaseModule } from '../base';
import { Api } from '@proton/js';
import { NativeTransaction } from '../../core/types';

// API Response Types
export interface APIResponse<T> {
  sync?: number;
  data: T;
}

export interface Market {
  id: number;
  symbol: string;
  base_token: string;
  quote_token: string;
  base_precision: number;
  quote_precision: number;
}

// Order Related Types
export interface OrderParams {
  marketSymbol: string;
  market_id: number;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  order_type: number;
  quantity: number;
  price: number;
  trigger_price: string;
  fill_type: 'GTC' | 'IOC' | 'FOK';
  account?: string;
  order_id?: string;
  ordinal_order_id?: string;
}

export interface SerializedOrder {
  account: string;
  market_id: number;
  side: number;  // 1 = BUY, 2 = SELL
  type: number;  // 1 = MARKET, 2 = LIMIT, 3 = STOP
  quantity: string;
  price?: string;
  stop_price?: string;
  fill_type: string; // 'GTC', 'IOC', 'FOK'
  referrer?: string;
}

export interface SubmitOrderResponse {
  success: boolean;
  transaction_id?: string;
  error?: string;
}

// Market Data Types
export interface MarketData {
  pair: string;
  price: number;
  priceChange: number;
  volume: number;
  timestamp: number;
  depth: {
    asks: OrderBookLevel[];
    bids: OrderBookLevel[];
  };
  ohlcv: OHLCV;
  trades: RecentTrade[];
}

export interface OrderBookDepth {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total?: string;
  count?: number;
}

export interface RecentTrade {
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
  maker: string;
  taker: string;
  fee: number;
}

export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  price_change: number;
  volume_weighted_price: number;
}

// Market Constants
export const MARKET_IDS = {
  'XPR_XMD': 1,
  'XDOGE_XMD': 2,
  'XBTC_XMD': 3
} as const;

// API Response Types for specific endpoints
export interface TradeResponse {
  block_num: string;
  block_time: string;
  trade_id: string;
  market_id: number;
  price: number;
  bid_user: string;
  ask_user: string;
  bid_amount: number;
  ask_amount: number;
  bid_fee: number;
  ask_fee: number;
  order_side: number;  // 1 = BUY, 2 = SELL
  trx_id: string;
}

export interface OHLCVDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  volume_bid: number;
  count: number;
}

export interface OHLCVResponse {
  sync: number;
  data: OHLCVDataPoint[];
}

export interface OrderBookAPILevel {
  count: number;      // Price level
  bid: number;        // Bid size
  ask: number;        // Ask size
  quantity: number;   // Total quantity
  level?: number;     // Optional legacy field
}

export interface OrderBookResponse {
  sync: number;
  data: {
    bids: OrderBookAPILevel[];
    asks: OrderBookAPILevel[];
  }
}

// Add to existing interfaces
export interface TrendAnalysis {
  trend: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  indicators: {
    priceAction: {
      trend: string;
      strength: number;
      support: number;
      resistance: number;
      suggestedSize?: number;
    };
    volume: {
      trend: string;
      strength: number;
      average24h: number;
    };
    orderBook: {
      buyPressure: number;
      sellPressure: number;
      imbalance: number;
    };
    volatility: {
      hourly: number;
      daily: number;
    };
  };
  forced?: boolean;
}

export interface OrderLifecycle {
  order_id: string;
  ordinal_order_id: string;
  status: string;
  filled_quantity: string;
  remaining_quantity: string;
  average_price: string;
  trades: Array<{
    quantity: string;
    price: string;
    timestamp: string;
  }>;
}

export interface DexModule extends BaseModule {
  account: string;
  api: Api;
  analyzeTrends(marketSymbol: string, timeframe: number, forceAction?: boolean): Promise<TrendAnalysis>;
  getMarketData(marketSymbol: string): Promise<MarketData>;
  placeOrder(params: OrderParams): Promise<SubmitOrderResponse>;
  getTransaction(txid: string): Promise<NativeTransaction | null>;
  getOrderLifecycle(ordinalId: string): Promise<OrderLifecycle>;
}

export interface MarketTokens {
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
}

export interface TokenInfo {
  code: string;
  contract: string;
  precision: number;
  multiplier: string;
}

// Add after the SubmitOrderResponse interface
export interface TransactionResult {
  processed?: {
    action_traces: Array<{
      inline_traces?: Array<{
        data?: {
          ordinal_order_id?: string;
        };
      }>;
    }>;
    block_num?: number;
  };
}

