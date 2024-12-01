import { getLogger } from './logger';
import { BaseModule } from '../modules/base';
import { ModuleMemory } from './memory/types';
import { ImageModule } from '../modules/image';
import { MintModule } from '../modules/mint';
import { 
  Collection, 
  ModuleActionResult as MintResult 
} from '../modules/mint/types';
import { 
  ImageModuleConfig
} from '../modules/image/types';
import * as path from 'path';

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

interface AIResponse {
  prompt: string;
  style?: string;
}

const logger = getLogger();

export class AgentGuide {
  private modules: Map<string, BaseModule>;
  private moduleMemories: Map<string, ModuleMemory>;
  private readonly MEMORY_LIMIT = 10;

  constructor(modules: Record<string, BaseModule>) {
    this.modules = new Map(Object.entries(modules));
    this.moduleMemories = new Map();

    // Validate required environment variables
    const requiredEnvVars = [
      'REPLICATE_API_TOKEN',
      'PINATA_API_KEY',
      'PINATA_SECRET_KEY'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Ensure ImageModule has proper config
    const imageModule = this.modules.get('IMAGE');
    if (imageModule instanceof ImageModule) {
      const config = {
        tempDir: path.join(process.cwd(), 'data', 'images'),
        pinataApiKey: process.env.PINATA_API_KEY!,
        pinataSecretKey: process.env.PINATA_SECRET_KEY!
      };
      imageModule.configure(config);
    }
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

  private generateSchemaName(): string {
    // Format: s + 4 random chars + 1 number (1-5) = 6 chars total
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const nums = '12345';
    
    // Generate 4 random letters
    let randomChars = '';
    for (let i = 0; i < 4; i++) {
        randomChars += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Generate 1 number (1-5 only as per Proton requirements)
    const randomNum = nums.charAt(Math.floor(Math.random() * nums.length));

    return `s${randomChars}${randomNum}`;
  }

  private async handleNFTCreation(): Promise<string> {
    try {
        const imageModule = this.modules.get('IMAGE') as ImageModule;
        const mintModule = this.modules.get('MINT') as MintModule;

        if (!imageModule || !mintModule) {
            throw new Error('Required modules not found');
        }

        logger.info('Starting NFT creation process');
        
        // Generate creative prompt
        const creativePrompt = await this.generateCreativePrompt();
        logger.info('Image generation parameters:', creativePrompt);

        // Generate image
        const imageResult = await imageModule.execute('generateImage', {
            prompt: creativePrompt.prompt,
            raw: false,
            aspect_ratio: "1:1",
            output_format: "jpg",
            safety_tolerance: 2
        }) as ModuleResult<ImageData>;

        if (!imageResult.success || !imageResult.data) {
            throw new Error(`Failed to generate image: ${imageResult.error || 'Empty response from API'}`);
        }

        // Generate unique names for collection and schema
        const collectionName = this.generateCollectionName();
        const schemaName = this.generateSchemaName();
        
        logger.info(`Generated names:`, {
            collection: collectionName,
            schema: schemaName
        });

        // Create collection
        const collectionResult = await mintModule.execute('createCollection', {
            collection_name: collectionName,
            display_name: 'AI Collection',
            description: 'AI Generated Art Collection'
        }) as ModuleResult<Collection>;

        if (!collectionResult.success) {
            throw new Error(`Failed to create collection: ${collectionResult.error}`);
        }

        // Create schema
        const schemaResult = await mintModule.execute('createSchema', {
            collection_name: collectionName,
            schema_name: schemaName,
            schema_format: [
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string' },
                { name: 'image', type: 'string' },
                { name: 'attributes', type: 'string[]' }
            ]
        });

        if (!schemaResult.success) {
            throw new Error(`Failed to create schema: ${schemaResult.error}`);
        }

        // Wait for blockchain to process schema creation
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Create template using the same schema name
        const templateResult = await mintModule.execute('createTemplate', {
            collection_name: collectionName,
            schema_name: schemaName,  // Use generated schema name
            template: {
                name: 'AI Art #1',
                description: 'An AI-generated artwork',
                image: imageResult.data.ipfs_hash
            }
        }) as ModuleResult<{ template_id: number }>;

        if (!templateResult.success || !templateResult.data) {
            throw new Error(`Failed to create template: ${templateResult.error}`);
        }

        // Mint the NFT using the same schema name
        const mintResult = await mintModule.execute('mintAsset', {
            template_id: templateResult.data.template_id,
            collection_name: collectionName,
            schema_name: schemaName,
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

  private async generateCreativePrompt(): Promise<{
    prompt: string,
    raw: boolean,
    aspect_ratio: string,
    output_format: string,
    safety_tolerance: number
  }> {
    // Let AI be completely creative
    const prompts = [
      "What kind of unique NFT artwork should I create today?",
      "What's an innovative concept for digital art?",
      "Suggest an original idea for an NFT collection.",
      "What would make an interesting piece of digital art?",
      "What kind of artwork would be valuable in the NFT space?"
    ];

    // Randomly select a thought-provoking question
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    // Use AI to generate a complete creative response
    const aiResponse = await this.getAIResponse(prompt);

    return {
      prompt: aiResponse.prompt,
      raw: false,
      aspect_ratio: "1:1",
      output_format: "jpg",
      safety_tolerance: 2
    };
  }

  private async getAIResponse(_prompt: string): Promise<AIResponse> {
    try {
      // Prefix unused parameter with underscore
      const responses = [
        {
          prompt: "A surreal dreamscape where digital technology merges with organic nature",
          style: "digital surrealism"
        },
        {
          prompt: "Abstract representation of cryptocurrency trading patterns in motion",
          style: "data visualization"
        },
        {
          prompt: "Futuristic cityscape emerging from a quantum computer circuit",
          style: "tech-organic fusion"
        },
        {
          prompt: "Digital interpretation of emotional wavelengths in the metaverse",
          style: "abstract digital"
        }
      ];

      return responses[Math.floor(Math.random() * responses.length)];
    } catch (error) {
      logger.error('AI response generation failed', { error });
      // Fallback response if AI fails
      return {
        prompt: "A beautiful digital art piece",
        style: "digital art"
      };
    }
  }

  private ensureImageConfig(config: ImageModuleConfig): ImageModuleConfig {
    return {
      tempDir: config.tempDir,
      pinataApiKey: config.pinataApiKey,
      pinataSecretKey: config.pinataSecretKey
    };
  }

  configure(moduleConfig: ImageModuleConfig) {
    const imageModule = this.modules.get('IMAGE') as ImageModule;
    if (imageModule) {
      const validConfig = this.ensureImageConfig(moduleConfig);
      imageModule.configure(validConfig);
    }
  }
}
