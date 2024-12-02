export interface ModuleResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ImageData {
  ipfs_hash: string;
  url: string;
  localPath: string;
}

export interface TemplateData {
  template_id: number;
  name: string;
  collection_name: string;
}

export interface MintData {
  transaction_id: string;
  asset_id: string;
}

export type ImageResult = ModuleResult<ImageData>;
export type TemplateResult = ModuleResult<TemplateData>;
export type MintResult = ModuleResult<MintData>;

export interface ModuleActionResult {
    action: string;
    params: Record<string, unknown>;
    result: any;
    timestamp?: number;
}

export interface AIDecision {
  module: string;
  action: string;
  params: OrderParams | Record<string, unknown>;
  reasoning?: string;
  forced?: boolean;
}

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

export interface NativeTransaction {
  processed: {
    id: string;
    block_num: number;
    block_time: string;
    action_traces: Array<{
      inline_traces?: Array<{
        data?: {
          ordinal_order_id?: string;
        };
      }>;
    }>;
  };
} 