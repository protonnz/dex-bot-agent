import axios from 'axios';
import { BaseModule } from '../base';
import { DatabaseManager } from '../../core/database';
import { getLogger } from '../../core/logger';
import { ProtonClient } from '../../core/proton';
import { MarketData, OrderBookDepth, RecentTrade, OHLCV, OHLCVDataPoint, OHLCVResponse, OrderParams } from './types';

const logger = getLogger();

interface OrderBookLevel {
  count: number;
  level: number;
  bid: number;
  ask: number;
}

interface OrderBookResponse {
  sync: number;
  data: {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
  }
}

interface Balance {
  currency: string;
  amount: number;
  contract: string;
  decimals: number;
}

interface BalanceResponse {
  sync: number;
  data: Balance[];
}

interface AgentMarketSummary {
  pair: string;
  timestamp: string;
  balances: {
    currency: string;
    amount: number;
  }[];
  orderbook: {
    asks: {
      price: number;
      quantity: number;
    }[];
    bids: {
      price: number;
      quantity: number;
    }[];
  };
  ohlcv: {
    price: number;
    change24h: number;
    volume24h: number;
    high24h: number;
    low24h: number;
  };
  recentTrades: {
    price: number;
    quantity: number;
    side: string;
  }[];
  liquidity?: {
    askVolume: number;
    bidVolume: number;
    depth: number;
    spread: number | null;
    status: string;
  };
}

interface OHLCVCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  volume_bid?: number;
  timestamp: string;
}

export class DexModule extends BaseModule {
  protected db: DatabaseManager;
  private proton: ProtonClient;
  private readonly API_BASE = 'https://dex.api.mainnet.metalx.com/dex/v1';
  private readonly RATE_LIMIT = 10;
  private readonly TRUSTED_MARKETS = ['XPR_XMD', 'XDOGE_XMD', 'XBTC_XMD'] as const;

  constructor() {
    super('DEX', 'Handles DEX operations', [
      'getMarketData',
      'getMarketSummary',
      'getOrderBook',
      'getRecentTrades',
      'analyzeTrends',
      'checkLiquidity',
      'placeOrder'
    ]);
    this.db = new DatabaseManager('market');
    this.proton = new ProtonClient();
  }

  async initialize(): Promise<void> {
    await super.initialize();
    await this.db.initialize();
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS market_data (
        pair TEXT,
        price REAL,
        volume REAL,
        timestamp INTEGER,
        PRIMARY KEY (pair, timestamp)
      )
    `);
  }

  async execute(action: string, params: any): Promise<any> {
    switch (action) {
      case 'getMarketData':
        return this.getMarketData(params.pair);
      case 'getOrderBook':
        return this.getOrderBook(params.pair);
      case 'getRecentTrades':
        return this.getRecentTrades(params.pair);
      case 'analyzeTrends':
        return this.analyzeTrends(params.pair, params.timeframe);
      case 'checkLiquidity':
        return this.checkLiquidity(params.pair);
      case 'placeOrder':
        return this.placeOrder(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async getMarketData(pair: string): Promise<MarketData> {
    if (!this.TRUSTED_MARKETS.includes(pair as any)) {
      throw new Error(`Untrusted market pair: ${pair}`);
    }

    try {
      const [ohlcv, depth, trades] = await Promise.all([
        this.getOHLCV(pair),
        this.getOrderBook(pair),
        this.getRecentTrades(pair)
      ]);

      const marketData: MarketData = {
        pair,
        price: ohlcv.close,
        volume: ohlcv.volume,
        timestamp: Date.now(),
        depth,
        trades,
        ohlcv
      };

      await this.db.run(
        'INSERT INTO market_data (pair, price, volume, timestamp) VALUES (?, ?, ?, ?)',
        [pair, marketData.price, marketData.volume, marketData.timestamp]
      );

      return marketData;
    } catch (error) {
      logger.error('Failed to get market data', { error, pair });
      throw error;
    }
  }

  private async getOHLCV(pair: string): Promise<OHLCV> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
      const from = oneDayAgo.toISOString().replace('T', ' ').replace('.000', '');
      const to = now.toISOString().replace('T', ' ').replace('.000', '');

      const response = await axios.get<OHLCVResponse>(`${this.API_BASE}/chart/ohlcv`, {
        params: {
          symbol: pair,
          interval: '15',
          from,
          to,
          limit: '100'
        },
        headers: {
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      if (response.data?.data?.length) {
        const validCandles: OHLCVCandle[] = response.data.data
          .filter((candle: OHLCVDataPoint) =>
            candle && candle.volume != null && !isNaN(candle.volume)
          )
          .map(candle => ({
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume || 0,
            volume_bid: candle.volume_bid,
            timestamp: candle.time.toString()
          }));

        if (validCandles.length) {
          const first = validCandles[0];
          const last = validCandles[validCandles.length - 1];

          return {
            open: first.open,
            high: Math.max(...validCandles.map((c: OHLCVCandle) => c.high)),
            low: Math.min(...validCandles.map((c: OHLCVCandle) => c.low)),
            close: last.close,
            volume: validCandles.reduce((sum: number, c: OHLCVCandle) => sum + (c.volume || 0), 0),
            price_change: ((last.close - first.open) / first.open) * 100,
            volume_weighted_price: validCandles.reduce((sum: number, c: OHLCVCandle) => sum + (c.volume_bid || 0), 0) / 
                                 validCandles.reduce((sum: number, c: OHLCVCandle) => sum + (c.volume || 0), 0) || 0
          };
        }
      }

      throw new Error('No valid candles found in response');

    } catch (error) {
      logger.error('Failed to fetch OHLCV data', { error, pair });
      return {
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        volume: 0,
        price_change: 0,
        volume_weighted_price: 0
      };
    }
  }

  private async getOrderBook(pair: string): Promise<OrderBookDepth> {
    try {
      const response = await axios.get<OrderBookResponse>(`${this.API_BASE}/orders/depth`, {
        params: {
          symbol: pair,
          step: 1,       // Default precision
          limit: 100     // Default limit
        }
      });

      // Transform the response to match our OrderBookDepth interface
      return {
        bids: response.data.data.bids.map(level => ({
          price: level.level,
          quantity: level.bid,
          count: level.count
        })),
        asks: response.data.data.asks.map(level => ({
          price: level.level,
          quantity: level.ask,
          count: level.count
        })),
        timestamp: Date.now()
      };

    } catch (error) {
      logger.error('Failed to fetch order book', { error, pair });
      throw error;
    }
  }

  private async getRecentTrades(pair: string): Promise<RecentTrade[]> {
    try {
      const response = await axios.get(`${this.API_BASE}/trades/recent`, {
        params: {
          symbol: pair,
          offset: 0,      // Start from the beginning
          limit: 100      // Get last 100 trades
        }
      });

      // Transform the response to match our RecentTrade interface
      return response.data.data.map((trade: any) => ({
        price: trade.price,
        quantity: trade.bid_amount,  // Using bid_amount as quantity
        side: trade.order_side === 2 ? 'SELL' : 'BUY',  // 2 = SELL, 1 = BUY
        timestamp: new Date(trade.block_time).getTime()
      }));

    } catch (error) {
      logger.error('Failed to fetch recent trades', { error, pair });
      throw error;
    }
  }

  async analyzeTrends(pair: string, timeframe: number): Promise<{
    trend: 'bullish' | 'bearish' | 'neutral',
    confidence: number,
    indicators: any
  }> {
    const marketData = await this.getMarketData(pair);
    
    // Simple trend analysis based on price and volume
    const priceChange = (marketData.ohlcv.close - marketData.ohlcv.open) / marketData.ohlcv.open;
    const volumeChange = marketData.volume > 0 ? 1 : -1;
    
    let trend: 'bullish' | 'bearish' | 'neutral';
    if (priceChange > 0.02) trend = 'bullish';
    else if (priceChange < -0.02) trend = 'bearish';
    else trend = 'neutral';

    return {
      trend,
      confidence: Math.abs(priceChange) * 100,
      indicators: {
        priceChange,
        volumeChange,
        depth: {
          buyPressure: marketData.depth.bids.length,
          sellPressure: marketData.depth.asks.length
        }
      }
    };
  }

  async checkLiquidity(pair: string): Promise<{
    status: 'high' | 'medium' | 'low',
    metrics: any
  }> {
    const { depth } = await this.getMarketData(pair);
    
    const totalBidVolume = depth.bids.reduce((sum, bid) => sum + bid.quantity, 0);
    const totalAskVolume = depth.asks.reduce((sum, ask) => sum + ask.quantity, 0);
    const spreadPercentage = ((depth.asks[0].price - depth.bids[0].price) / depth.bids[0].price) * 100;

    let status: 'high' | 'medium' | 'low';
    if (totalBidVolume > 1000 && totalAskVolume > 1000 && spreadPercentage < 1) {
      status = 'high';
    } else if (totalBidVolume > 100 && totalAskVolume > 100 && spreadPercentage < 3) {
      status = 'medium';
    } else {
      status = 'low';
    }

    return {
      status,
      metrics: {
        bidVolume: totalBidVolume,
        askVolume: totalAskVolume,
        spread: spreadPercentage,
        depth: depth.bids.length + depth.asks.length
      }
    };
  }

  private async getAccountBalances(account: string): Promise<Balance[]> {
    try {
      const response = await axios.get<BalanceResponse>(`${this.API_BASE}/account/balances`, {
        params: { account },
        headers: {
          'accept': 'application/json'
        }
      });

      return response.data.data;
    } catch (error) {
      logger.error('Failed to fetch account balances', { error, account });
      throw error;
    }
  }

  private formatMarketDataForAgent(data: MarketData, balances: Balance[]): AgentMarketSummary {
    // Extract top order book levels
    const topAsks = data.depth.asks
      .slice(0, 3)
      .map(ask => ({
        price: ask.price,
        quantity: Math.round(ask.quantity * 1000) / 1000
      }));

    const topBids = data.depth.bids
      .slice(0, 3)
      .map(bid => ({
        price: bid.price,
        quantity: Math.round(bid.quantity * 1000) / 1000
      }));

    // Format OHLCV data
    const ohlcv = {
      price: Math.round(data.ohlcv.close * 1e6) / 1e6,
      change24h: Math.round(data.ohlcv.price_change * 100) / 100,
      volume24h: Math.round(data.ohlcv.volume),
      high24h: Math.round(data.ohlcv.high * 1e6) / 1e6,
      low24h: Math.round(data.ohlcv.low * 1e6) / 1e6
    };

    // Format recent trades
    const recentTrades = data.trades
      .slice(0, 5)
      .map(trade => ({
        price: Math.round(trade.price * 1e6) / 1e6,
        side: trade.side,
        quantity: Math.round(trade.quantity)
      }));

    // Format balances
    const relevantBalances = balances
      .filter(b => b.amount > 0)
      .map(b => ({
        currency: b.currency,
        amount: Math.round(b.amount * Math.pow(10, b.decimals)) / Math.pow(10, b.decimals)
      }));

    // Include liquidity metrics
    const liquidity = {
      askVolume: Math.round(data.depth.asks.reduce((sum, ask) => sum + ask.quantity, 0)),
      bidVolume: Math.round(data.depth.bids.reduce((sum, bid) => sum + bid.quantity, 0)),
      depth: data.depth.asks.length + data.depth.bids.length,
      spread: topAsks[0] && topBids[0] ? (topAsks[0].price - topBids[0].price) / topAsks[0].price : null,
      status: 'normal' // You can calculate this based on your metrics
    };

    return {
      pair: data.pair,
      timestamp: new Date(data.timestamp).toISOString(),
      balances: relevantBalances,
      orderbook: {
        asks: topAsks,
        bids: topBids
      },
      ohlcv,
      recentTrades,
      liquidity
    };
  }

  async placeOrder(params: OrderParams): Promise<unknown> {
    logger.info('Validating order parameters...', { params });
    
    if (!params.marketSymbol || !params.side || !params.type || !params.quantity) {
      throw new Error('Missing required order parameters');
    }

    try {
      logger.info('Submitting order to blockchain...', {
        market: params.marketSymbol,
        side: params.side,
        type: params.type,
        quantity: params.quantity,
        price: params.price
      });

      const action = {
        account: 'dex.proton',
        name: 'placeorder',
        authorization: [{
          actor: this.proton.getAccount(),
          permission: 'active'
        }],
        data: {
          account: this.proton.getAccount(),
          market_id: params.market_id,
          side: params.side,
          type: params.type,
          quantity: params.quantity,
          price: params.price,
          stop_price: params.stopPrice,
          fill_type: params.fillType || 'GTC'
        }
      };

      const result = await this.proton.transact({
        actions: [action]
      });

      logger.info('Order placed successfully:', {
        txid: result.transaction_id,
        blockNum: result.processed.block_num,
        params
      });

      return result;

    } catch (error) {
      logger.error('Failed to place order on blockchain:', {
        error: error instanceof Error ? error.message : String(error),
        params
      });
      throw error;
    }
  }
}

