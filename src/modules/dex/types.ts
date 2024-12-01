import { ORDERTYPES, ORDERSIDES, FILLTYPES } from '../../core/constants';

export interface Market {
  id: number;
  symbol: string;
  base_token: string;
  quote_token: string;
  base_precision: number;
  quote_precision: number;
}

export interface OrderParams {
  marketSymbol: string;
  market_id: number;
  side: keyof typeof ORDERSIDES;
  type: keyof typeof ORDERTYPES;
  quantity: number;
  price?: number;
  stopPrice?: number;
  fillType?: keyof typeof FILLTYPES;
}

export interface OrderData {
  account: string;
  market: string;
  market_id: number;
  side: keyof typeof ORDERSIDES;
  type: keyof typeof ORDERTYPES;
  quantity: number;
  price?: number;
  stopPrice?: number;
  fillType: keyof typeof FILLTYPES;
}

export interface DexTransactionResult {
  transaction_id: string;
  processed: {
    id: string;
    block_num: number;
    block_time: string;
    receipt: {
      status: string;
      cpu_usage_us: number;
      net_usage_words: number;
    };
    elapsed: number;
    net_usage: number;
    scheduled: boolean;
    action_traces: Array<{
      action_ordinal: number;
      creator_action_ordinal: number;
      closest_unnotified_ancestor_action_ordinal: number;
      receipt: {
        receiver: string;
        act_digest: string;
        global_sequence: number;
        recv_sequence: number;
        auth_sequence: Array<[string, number]>;
        code_sequence: number;
        abi_sequence: number;
      };
      receiver: string;
      act: {
        account: string;
        name: string;
        authorization: Array<{
          actor: string;
          permission: string;
        }>;
        data: any;
      };
      context_free: boolean;
      elapsed: number;
      console: string;
      trx_id: string;
      block_num: number;
      block_time: string;
      producer_block_id: string | null;
      account_ram_deltas: Array<{
        account: string;
        delta: number;
      }>;
      except: null;
      error_code: null;
    }>;
    account_ram_delta: null;
    except: null;
    error_code: null;
  };
}

export const MARKET_IDS = {
  'XPR_XMD': 1,
  'XDOGE_XMD': 2,
  'XBTC_XMD': 3
} as const;

export interface MarketData {
  pair: string;
  price: number;
  volume: number;
  timestamp: number;
  depth: OrderBookDepth;
  trades: RecentTrade[];
  ohlcv: OHLCV;
}

export interface OrderBookDepth {
  bids: Array<{
    price: number;
    quantity: number;
    count: number;
  }>;
  asks: Array<{
    price: number;
    quantity: number;
    count: number;
  }>;
  timestamp: number;
}

export interface RecentTrade {
  id: string;
  price: number;
  quantity: number;
  side: keyof typeof ORDERSIDES;
  timestamp: number;
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

export interface MarketSummary {
  pair: string;
  last_price: number;
  price_change_24h: number;
  volume_24h: number;
  high_24h: number;
  low_24h: number;
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
