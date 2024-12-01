import { BaseModule } from '../base';
import { ImageModuleConfig, ImageGenerationParams, ImageGenerationResult, ReplicateModelString } from './types';
import { getLogger } from '../../core/logger';
import Replicate from 'replicate';
import fs from 'fs/promises';
import path from 'path';
import { pinFileToIPFS } from '../../core/ipfs';
import sharp from 'sharp';

const logger = getLogger();

interface ReplicatePrediction {
  error?: string;
  output?: string | string[];
  [key: string]: any;
}

export class ImageModule extends BaseModule {
  private client: Replicate;
  private config: ImageModuleConfig;
  private tempDir: string;
  private readonly MODEL: ReplicateModelString = "black-forest-labs/flux-1.1-pro";

  constructor(config: ImageModuleConfig) {
    super(
      'IMAGE',
      'Handles AI image generation and management',
      ['generateImage', 'getRecentImages', 'getSuccessfulPrompts']
    );
    
    this.config = config;
    this.tempDir = path.resolve(process.cwd(), config.tempDir);
    
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

      const output = await this.client.run(
        this.MODEL,
        {
          input: {
            prompt: params.prompt,
            negative_prompt: params.negative_prompt,
            num_inference_steps: params.num_inference_steps || 50,
            guidance_scale: params.guidance_scale || 7.5,
            seed: params.seed || Math.floor(Math.random() * 1000000)
          }
        }
      ) as ReplicatePrediction;

      if (!output) {
        throw new Error('Invalid response from image generation API');
      }

      const imageUrl = Array.isArray(output) ? output[0] : output;

      if (!imageUrl) {
        throw new Error(`No image URL in prediction output: ${JSON.stringify(output)}`);
      }

      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const imageBuffer = await response.arrayBuffer();
      
      // Process with Sharp to ensure valid JPG
      const processedImage = await sharp(Buffer.from(imageBuffer))
        .jpeg({
          quality: 100,
          chromaSubsampling: '4:4:4'
        })
        .toBuffer();

      // Save the processed image
      const timestamp = Date.now();
      const filename = `${timestamp}-generated.jpg`;
      const localPath = path.join(this.tempDir, filename);

      await fs.writeFile(localPath, new Uint8Array(imageBuffer));
      logger.info('Image saved locally', { localPath });

      // Verify the image is valid
      try {
        const metadata = await sharp(localPath).metadata();
        if (!metadata.width || !metadata.height || metadata.format !== 'jpeg') {
          throw new Error('Invalid image generated');
        }
        logger.info('Image validation successful', { 
          width: metadata.width, 
          height: metadata.height, 
          format: metadata.format 
        });
      } catch (error) {
        throw new Error(`Image validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

      const ipfsHash = await pinFileToIPFS(localPath, {
        pinataApiKey: this.config.pinataApiKey,
        pinataSecretKey: this.config.pinataSecretKey
      });
      logger.info('Image uploaded to IPFS', { ipfsHash });

      return {
        success: true,
        data: {
          url: `ipfs://${ipfsHash}`,
          localPath,
          ipfs_hash: ipfsHash
        }
      };

    } catch (error) {
      logger.error('Image generation failed', {
        error: error instanceof Error ? error.message : String(error),
        params,
        modelId: this.MODEL
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
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

  public configure(config: ImageModuleConfig): void {
    this.config = config;
  }

  private async saveImage(imageData: Buffer): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${timestamp}-generated.jpg`;
    const localPath = path.join(this.tempDir, fileName);
    
    await fs.writeFile(localPath, imageData);
    getLogger().info('Image saved locally', { localPath });
    
    return localPath;
  }
}
