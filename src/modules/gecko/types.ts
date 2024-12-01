export enum OrderType {
  LIMIT = 0,
  MARKET = 1,
  STOP_LOSS = 2,
  TAKE_PROFIT = 3
}

export enum FillType {
  GTC = 0, // Good Till Cancel
  IOC = 1, // Immediate or Cancel
  POST_ONLY = 2
}

export interface OrderParams {
  marketSymbol: string;
  side: 'BUY' | 'SELL';
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  fillType?: FillType;
}

export interface CoinGeckoPrice {
  proton: {
    usd: number;
    usd_24h_change: number;
  };
}
