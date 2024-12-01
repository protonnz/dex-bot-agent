import { TransactionResult } from '../base';

export interface MintModuleConfig {
  chainId: string;
  contractAddress: string;
}

export interface Collection {
  collection_name: string;
  display_name: string;
  description: string;
  created_at?: number;
}

export interface Schema {
  schema_name: string;
  schema_format: SchemaFormat[];
  collection_name: string;
  created_at?: number;
}

export interface Template {
  template_id: number;
  id: number;
  collection_name: string;
  schema_name: string;
  name: string;
  description?: string;
  image: string;
  created_at?: number;
}

export interface MintAssetParams {
  template_id: number;
  collection_name: string;
  schema_name: string;
  immutable_data: {
    image: string;
    attributes: Array<{
      key: string;
      value: string | number;
    }>;
  };
}

export interface SchemaFormat {
  name: string;
  type: string;
}

export interface AtomicAssetsResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface AtomicTransactionResult extends TransactionResult {
  processed?: {
    action_traces: Array<{
      return_value?: string;
    }>;
  };
  transaction_id: string;
}

export interface ModuleActionResult {
  type: string;
  params: Record<string, any>;
  timestamp: number;
  success: boolean;
  error?: string;
  data?: {
    transaction_id?: string;
    collection_name?: string;
    schema_name?: string;
    template_id?: number;
  };
}

export interface ProtonTransactionResult {
  processed?: {
    action_traces: Array<{
      return_value?: string;
    }>;
  };
  transaction_id: string;
}
