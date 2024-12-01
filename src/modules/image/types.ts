export interface ImageGenerationParams {
  prompt: string;
  style?: string;
  negative_prompt?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  seed?: number;
  aspect_ratio?: string;
  safety_tolerance?: number;
}

export interface ImageGenerationResult {
  success: boolean;
  data?: {
    url: string;
    localPath: string;
    ipfs_hash: string;
  };
  error?: string;
}

export type ReplicateModelString = `${string}/${string}` | `${string}/${string}-${string}` | `${string}/${string}-${string}-${string}`;

export interface ImageModuleConfig {
  tempDir: string;
  pinataApiKey: string;
  pinataSecretKey: string;
  model?: string;
}

export interface ReplicatePrediction {
  error?: string;
  output?: string | string[];
  [key: string]: any;
}
