export interface Collection {
  collection_name: string;
  display_name: string;
  description: string;
}

export interface Template {
  name: string;
  description: string;
  image: string;
}

export interface MintAssetParams {
  template_id: number;
  collection_name: string;
  schema_name: string;
  immutable_data: {
    image: string;
    attributes: Array<any>;
  };
}

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  data?: {
    template_id?: number;
    asset_id?: string;
    [key: string]: any;
  };
}

export interface TransactResult {
  transaction_id: string;
  processed: any;
}

export interface TemplateData {
  template_id: number;
}

export interface ModuleActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface MintResult extends ModuleActionResult {
  data?: {
    asset_id: string;
  };
}
