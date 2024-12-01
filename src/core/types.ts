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