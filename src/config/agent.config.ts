interface AgentConfig {
  TRADE: {
    RISK_PERCENTAGE: number;
    MIN_XPR_AMOUNT: number;
    MAX_XPR_AMOUNT: number;
  };
  MARKETS: {
    SUPPORTED: readonly string[];
    AVOID: readonly string[];
  };
  AGENT: {
    DELAY_SECONDS: number;
    MAX_ORDERS_PER_MARKET: number;
  };
  DEX: {
    CONTRACT_ACCOUNT: string;
    API_ENDPOINT: string;
  };
}

export const AGENT_CONFIG: AgentConfig = {
  TRADE: {
    RISK_PERCENTAGE: process.env.TRADE_RISK_PERCENTAGE ? Number(process.env.TRADE_RISK_PERCENTAGE) : 5,
    MIN_XPR_AMOUNT: process.env.MIN_XPR_TRADE_AMOUNT ? Number(process.env.MIN_XPR_TRADE_AMOUNT) : 100,
    MAX_XPR_AMOUNT: process.env.MAX_XPR_TRADE_AMOUNT ? Number(process.env.MAX_XPR_TRADE_AMOUNT) : 10000
  },
  MARKETS: {
    SUPPORTED: ['XPR_XMD'] as const,
    AVOID: (process.env.MARKETS_TO_AVOID || '').split(',').filter(Boolean) as readonly string[]
  },
  AGENT: {
    DELAY_SECONDS: process.env.AGENT_DELAY ? Number(process.env.AGENT_DELAY) : 180,
    MAX_ORDERS_PER_MARKET: process.env.MAX_ORDERS_PER_MARKET ? Number(process.env.MAX_ORDERS_PER_MARKET) : 10
  },
  DEX: {
    CONTRACT_ACCOUNT: process.env.DEX_CONTRACT_ACCOUNT || 'dex',
    API_ENDPOINT: process.env.API_ENDPOINT || 'https://api.protonnz.com'
  }
} as const; 