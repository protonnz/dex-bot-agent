import OpenAI from 'openai';
import { BaseModule, ModuleAction } from '../modules/base';
import { Logger } from './logger';
import { DexModule } from '../modules/dex';

interface AIDecision {
  module: string;
  action: string;
  params: Record<string, any>;
  reasoning: string;
}

export class Agent {
  private modules: Map<string, BaseModule>;
  private openai: OpenAI;
  private logger: Logger;
  private actionHistory: ModuleAction[];

  constructor(openaiApiKey: string, logger: Logger) {
    this.modules = new Map();
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.logger = logger;
    this.actionHistory = [];
  }

  registerModule(module: BaseModule) {
    this.modules.set(module.getName(), module);
  }

  private async getMarketData(): Promise<{
    price: number;
    change24h: number;
  } | null> {
    try {
      const geckoModule = this.modules.get('GECKO');
      if (!geckoModule) {
        this.logger.error('GeckoModule not found');
        return null;
      }

      const priceData = await geckoModule.execute('getPrice', {});
      if (!priceData.success || !priceData.data) {
        this.logger.error('Failed to get price data from CoinGecko');
        return null;
      }

      return priceData.data as { price: number; change24h: number };
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Failed to get market data: ${error.message}`);
      return null;
    }
  }

  private buildPrompt(marketData: { price: number; change24h: number } | null): string {
    const recentActions = this.actionHistory.slice(-5);
    
    return `
You are an AI agent managing trading operations on the Metal X DEX.

Current Market Data:
${marketData ? `
- XPR Price: $${marketData.price}
- 24h Change: ${marketData.change24h.toFixed(2)}%
` : 'Market data unavailable'}

Recent Actions:
${JSON.stringify(recentActions, null, 2)}

Available Markets:
- XPR_XMD (Market ID: 1)

Available Order Types:
- LIMIT: Set specific price for execution
- MARKET: Immediate execution at best available price
- STOP_LOSS: Trigger sell when price falls below threshold
- TAKE_PROFIT: Trigger sell when price reaches profit target

Rules:
1. Never place orders more than 5% above current market price
2. Use current price as reference for all decisions
3. Start with small order sizes (max 100 XPR)
4. Prefer limit orders over market orders
5. Include stop loss for any buy orders

Based on the current price and market conditions, what trading action would you recommend?

Respond with valid JSON only, in this format:
{
  "module": "DEX",
  "action": "placeOrder",
  "params": {
    "marketSymbol": "XPR_XMD",
    "market_id": 1,
    "side": "BUY",
    "type": "LIMIT",
    "quantity": 100,
    "price": 0.1,
    "stopPrice": 0.095
  },
  "reasoning": "Brief explanation here"
}`.trim();
  }

  private async logMarketState() {
    try {
      const dexModule = this.modules.get('DEX') as DexModule;
      if (!dexModule) return;
      
      const markets = await dexModule.execute('getMarkets', {});
      this.logger.info('Current Market State:');
      this.logger.info(JSON.stringify(markets.data, null, 2));
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Failed to log market state: ${error.message}`);
    }
  }

  private async makeTradeDecision(): Promise<AIDecision> {
    try {
      const marketData = await this.getMarketData();
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a trading bot. Always respond with valid JSON only, no additional text. Format your response as a JSON object with module, action, params, and reasoning fields."
          },
          { 
            role: "user", 
            content: this.buildPrompt(marketData)
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content in GPT response');
      }

      try {
        const decision = JSON.parse(content);
        this.logger.info(`Parsed AI decision: ${JSON.stringify(decision, null, 2)}`);
        return decision as AIDecision;
      } catch (err) {
        this.logger.error(`Failed to parse GPT response: ${content}`);
        throw err;
      }
    } catch (err) {
      const error = err as Error;
      this.logger.error(`AI decision error: ${error.message}`);
      throw error;
    }
  }

  async executeLoop() {
    this.logger.info('Starting new agent loop...');
    
    try {
      const decision = await this.makeTradeDecision();
      this.logger.info(`AI Decision: ${JSON.stringify(decision, null, 2)}`);

      if (decision.module === 'DEX') {
        const marketData = await this.getMarketData();
        
        if (marketData) {
          const proposedPrice = decision.params.price;
          const maxAllowedPrice = marketData.price * 1.05;

          if (proposedPrice > maxAllowedPrice) {
            this.logger.warn(`Rejected trade: Price ${proposedPrice} is more than 5% above market price ${marketData.price}`);
            return;
          }
        }

        const dexModule = this.modules.get('DEX') as DexModule;
        const result = await dexModule.execute(decision.action, decision.params);
        this.logger.info(`Trade execution result: ${JSON.stringify(result, null, 2)}`);
      }
    } catch (err) {
      const error = err as Error;
      this.logger.error(`Loop execution error: ${error.message}`);
    }

    this.logger.info('Loop completed. Waiting for next iteration...');
  }
}
