export interface ImageGenerationParams {
  prompt: string;
  style?: string;
  negative_prompt?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  seed?: number;
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

export interface ImageModuleConfig {
  model: string;
  tempDir: string;
  pinataApiKey: string;
  pinataSecretKey: string;
}
