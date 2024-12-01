import { getLogger } from './logger';
import { BaseModule } from '../modules/base';
import { ModuleMemory } from './memory/types';
import { ImageModule } from '../modules/image';
import { MintModule } from '../modules/mint';
import { 
  Collection, 
  Template, 
  MintAssetParams, 
  ModuleActionResult as MintResult 
} from '../modules/mint/types';
import { 
  ImageGenerationParams, 
  ImageGenerationResult as ImageResult 
} from '../modules/image/types';
import { randomUUID } from 'crypto';

interface ModuleResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ImageData {
  url: string;
  localPath: string;
  ipfs_hash: string;
}

interface TemplateData {
  template_id: number;
  success: boolean;
  error?: string;
}

const logger = getLogger();

export class AgentGuide {
  private modules: Map<string, BaseModule>;
  private moduleMemories: Map<string, ModuleMemory>;
  private readonly MEMORY_LIMIT = 10;

  constructor(modules: Record<string, BaseModule>) {
    this.modules = new Map(Object.entries(modules));
    this.moduleMemories = new Map();
  }

  async start(intent: string): Promise<void> {
    logger.info('Starting guide mode...');
    
    try {
      // Initialize before processing intent
      await this.initialize();

      if (intent.includes('mint')) {
        const imageModule = this.modules.get('IMAGE') as ImageModule;
        const mintModule = this.modules.get('MINT') as MintModule;

        if (!imageModule || !mintModule) {
          throw new Error('Required modules not found');
        }

        // Ensure both modules are initialized
        await Promise.all([
          imageModule.initialize(),
          mintModule.initialize()
        ]);

        // Get or create memory states
        const imageMemory = await imageModule.getMemoryState();
        const mintMemory = await mintModule.getMemoryState();

        if (!imageMemory || !mintMemory) {
          logger.info('No existing memory found, creating new memory states');
        }

        // Handle NFT creation
        const result = await this.handleNFTCreation();
        logger.info('NFT creation completed', { result });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to start guide mode', { error: message });
      throw new Error(`Failed to start guide mode: ${message}`);
    }
  }

  private generateCollectionName(): string {
    // Format: ai + 5 random chars + 5 random numbers (1-5) = 12 chars total
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const nums = '12345';
    
    // Generate 5 random letters
    let randomChars = '';
    for (let i = 0; i < 5; i++) {
      randomChars += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Generate 5 random numbers (1-5 only as per Proton requirements)
    let randomNums = '';
    for (let i = 0; i < 5; i++) {
      randomNums += nums.charAt(Math.floor(Math.random() * nums.length));
    }

    return `ai${randomChars}${randomNums}`;
  }

  private async handleNFTCreation(): Promise<string> {
    try {
      const imageModule = this.modules.get('IMAGE') as ImageModule;
      const mintModule = this.modules.get('MINT') as MintModule;

      if (!imageModule || !mintModule) {
        throw new Error('Required modules not found');
      }

      logger.info('Starting NFT creation process');
      logger.info('Attempting to generate image...', {
        module: 'IMAGE',
        action: 'generateImage',
        capabilities: imageModule.getCapabilities()
      });

      // Generate image
      const imageResult = await imageModule.execute('generateImage', {
        prompt: 'A beautiful digital art piece',
        style: 'digital art',
        negative_prompt: 'blurry, low quality',
      } as ImageGenerationParams) as ModuleResult<ImageData>;

      logger.info('Image generation result', { 
        success: imageResult.success,
        error: imageResult.error,
        hasData: !!imageResult.data
      });

      if (!imageResult.success || !imageResult.data) {
        throw new Error(`Failed to generate image: ${imageResult.error || 'Unknown error'}`);
      }

      // Create a valid collection name (12 chars: ai + 5 letters + 5 numbers)
      const collectionName = this.generateCollectionName();
      logger.info(`Generated collection name: ${collectionName}`);

      // Create collection
      const collectionResult = await mintModule.execute('createCollection', {
        collection_name: collectionName,
        display_name: 'AI Collection',
        description: 'A collection of AI-generated artwork'
      }) as ModuleResult<Collection>;

      if (!collectionResult.success) {
        throw new Error(`Failed to create collection: ${collectionResult.error}`);
      }

      // Create template
      const templateResult = await mintModule.execute('createTemplate', {
        collection_name: collectionName,
        schema_name: 'ai.art',
        template: {
          name: 'AI Art #1',
          description: 'An AI-generated artwork',
          image: imageResult.data.ipfs_hash
        }
      }) as ModuleResult<{ template_id: number }>;

      if (!templateResult.success || !templateResult.data?.template_id) {
        throw new Error(`Failed to create template: ${templateResult.error || 'No template ID returned'}`);
      }

      // Mint the NFT
      const mintResult = await mintModule.execute('mintAsset', {
        template_id: templateResult.data.template_id,
        collection_name: collectionName,
        schema_name: 'ai.art',
        immutable_data: {
          image: imageResult.data.ipfs_hash,
          attributes: []
        }
      }) as ModuleResult<MintResult>;

      if (!mintResult.success) {
        throw new Error(`Failed to mint NFT: ${mintResult.error}`);
      }

      return `Successfully created NFT in collection ${collectionName}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('NFT creation failed', { error: message });
      throw new Error(`NFT creation failed: ${message}`);
    }
  }

  async initialize(): Promise<void> {
    logger.info('Initializing modules for guide mode...');
    
    try {
      // Initialize each module
      for (const [name, module] of this.modules.entries()) {
        logger.info(`Initializing module: ${name}`);
        await module.initialize();
        logger.info(`Module ${name} initialized successfully`);
      }

      // Load module memories after initialization
      await this.loadModuleMemories();

      logger.info('Guide mode initialization complete');
    } catch (error) {
      logger.error('Failed to initialize guide mode', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private async loadModuleMemories(): Promise<void> {
    for (const [name, module] of this.modules.entries()) {
      logger.info(`Loading memory for module: ${name}`);
      try {
        await module.initialize();
        const memoryState = await module.getMemoryState();
        if (memoryState) {
          this.moduleMemories.set(name, memoryState);
          logger.info(`Memory loaded for module: ${name}`);
        } else {
          logger.info(`No existing memory found for module: ${name}`);
        }
      } catch (error) {
        logger.error(`Failed to load memory for module: ${name}`, { error });
      }
    }
  }

  async executeIntent(intent: string): Promise<string> {
    logger.info(`Executing intent: "${intent}"`);
    
    logger.info('Current module states:');
    for (const [name, memory] of this.moduleMemories.entries()) {
      logger.info(`${name} recent actions:`, 
        memory.recentActions.map(a => 
          `${a.action} at ${new Date(a.timestamp).toISOString()}`
        ).join(', ')
      );
    }

    if (intent.toLowerCase().includes('nft')) {
      return this.handleNFTCreation();
    }

    return 'Intent not recognized';
  }

  async getMemorySnapshot(): Promise<string> {
    const snapshot = Array.from(this.moduleMemories.entries())
      .map(([name, memory]) => {
        return `${name} Module:\n` +
          memory.recentActions
            .map(a => `  ${new Date(a.timestamp).toLocaleString()}: ${a.action}`)
            .join('\n');
      })
      .join('\n\n');

    return `Current Memory State:\n${snapshot}`;
  }

  getAllModuleCapabilities(): string[] {
    const capabilities: string[] = [];
    for (const module of this.modules.values()) {
      capabilities.push(...module.getCapabilities());
    }
    return capabilities;
  }
}
