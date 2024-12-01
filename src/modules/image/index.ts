import { BaseModule } from '../base';
import { ImageGenerationParams, ImageGenerationResult, ImageModuleConfig } from './types';
import { getLogger } from '../../core/logger';
import Replicate from 'replicate';
import fs from 'fs/promises';
import path from 'path';
import { pinFileToIPFS } from '../../core/ipfs';

const logger = getLogger();

export class ImageModule extends BaseModule {
  private client: Replicate;
  private config: ImageModuleConfig;
  private tempDir: string;

  constructor(config: ImageModuleConfig) {
    super(
      'IMAGE',
      'Handles AI image generation and management',
      ['generateImage', 'getRecentImages', 'getSuccessfulPrompts']
    );
    
    this.config = config;
    this.tempDir = path.resolve(process.cwd(), config.tempDir);
    
    // Initialize Replicate client with API token from environment
    this.client = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  async initialize(): Promise<void> {
    await super.initialize();
    
    // Ensure temp directory exists
    await fs.mkdir(this.tempDir, { recursive: true });
    logger.info('Image directories initialized');

    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN environment variable is not set');
    }
  }

  async execute(action: string, params: any): Promise<any> {
    await this.validateAction(action);

    switch (action) {
      case 'generateImage':
        return this.generateImage(params as ImageGenerationParams);
      case 'getRecentImages':
        return this.getRecentImages();
      case 'getSuccessfulPrompts':
        return this.getSuccessfulPrompts();
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async generateImage(params: ImageGenerationParams): Promise<ImageGenerationResult> {
    try {
      logger.info('Starting image generation', { params });

      // Parse model string to ensure it matches required format
      const [owner, model] = this.config.model.split('/');
      const [name, version] = model.split(':');
      
      if (!owner || !name || !version) {
        throw new Error('Invalid model format. Expected "owner/name:version"');
      }

      const modelString = `${owner}/${name}:${version}` as const;
      const output = await this.client.run(
        modelString,
        {
          input: {
            prompt: params.prompt,
            negative_prompt: params.negative_prompt,
            num_inference_steps: params.num_inference_steps || 50,
            guidance_scale: params.guidance_scale || 7.5,
            seed: params.seed || Math.floor(Math.random() * 1000000)
          }
        }
      );

      if (!output || !Array.isArray(output)) {
        throw new Error('Invalid response from image generation API');
      }

      const imageUrl = output[0];
      const localPath = path.join(this.tempDir, `${Date.now()}.png`);

      // Download and save image
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      await fs.writeFile(localPath, Buffer.from(buffer));

      // Upload to IPFS
      const ipfsHash = await pinFileToIPFS(localPath, {
        pinataApiKey: this.config.pinataApiKey,
        pinataSecretKey: this.config.pinataSecretKey
      });

      await this.recordAction('generateImage', 'success', {
        prompt: params.prompt,
        url: imageUrl,
        ipfs_hash: ipfsHash
      });

      return {
        success: true,
        data: {
          url: imageUrl,
          localPath,
          ipfs_hash: ipfsHash
        }
      };
    } catch (error) {
      logger.error('Failed to generate image', { error, params });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async getRecentImages(): Promise<string[]> {
    const memory = await this.getMemoryState();
    return memory?.recentActions
      .filter(action => action.action === 'generateImage' && action.result === 'success')
      .map(action => action.metadata.url) || [];
  }

  private async getSuccessfulPrompts(): Promise<string[]> {
    const memory = await this.getMemoryState();
    return memory?.recentActions
      .filter(action => action.action === 'generateImage' && action.result === 'success')
      .map(action => action.metadata.prompt) || [];
  }
}
