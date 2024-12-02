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
import { HelperAgent } from './helper-agent';
import { DexModule, TransactionResult } from '../modules/dex/types';
import { AIDecision } from '../interfaces/ai.interface';
import { OrderType, FillType } from '../modules/gecko/types';

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

interface AIHelper {
  // Add properties/methods as needed
}

interface ModuleMemory {
  recentActions: Array<{
    timestamp: number;
    action: string;
  }>;
  // Add other memory properties as needed
}

const logger = getLogger();

export class AgentGuide {
  private modules: Map<string, any>;
  private helper: AIHelper;
  private moduleMemories: Map<string, ModuleMemory>;

  constructor(modules: Record<string, any>) {
    this.modules = new Map(Object.entries(modules));
    this.moduleMemories = new Map();
    this.helper = new HelperAgent();

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

  async start(input: string, autoMode: boolean = false, forceAction: boolean = false): Promise<void> {
    try {
      logger.info('Starting guide mode...', { autoMode, forceAction });
      
      // If force trade is enabled, go straight to DEX operation
      if (forceAction) {
        logger.info('Force trade enabled - proceeding directly to market analysis');
        await this.handleDEXOperation(forceAction);
        return;
      }
      
      // Original autoMode and manual mode logic continues...
      if (autoMode) {
        // Let the AI helper decide what action to take
        const helperResponse = await this.helper.discuss(
          "As an autonomous agent, analyze the current market conditions and module states to decide whether to perform market analysis or create an NFT. Consider factors like market volatility, recent trades, and creative opportunities.", 
          { availableModules: Array.from(this.modules.keys()) }
        );

        logger.info('Helper autonomous decision', { response: helperResponse });

        // Parse the AI's decision
        const match = helperResponse.match(/USE (\w+)/);
        if (!match) {
          throw new Error('Invalid helper response format');
        }

        // Execute based on AI decision
        switch (match[1]) {
          case 'DEX':
            logger.info('AI chose to analyze markets');
            await this.handleDEXOperation(forceAction);
            break;
          case 'MINT':
            logger.info('AI chose to create NFT');
            await this.handleNFTCreation();
            break;
          default:
            throw new Error(`Unsupported module decision: ${match[1]}`);
        }
      } else {
        // Original interactive flow
        const intent = await this.analyzeIntent(input);
        logger.info('Analyzed intent', { intent });

        if (intent === 'MARKET_ANALYSIS') {
          await this.handleDEXOperation(forceAction);
        } else if (intent === 'NFT_CREATION') {
          await this.handleNFTCreation();
        } else {
          throw new Error(`Unsupported intent: ${intent}`);
        }
      }

    } catch (error) {
      logger.error('Failed to start guide mode', { error });
      throw new Error(`Failed to start guide mode: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async analyzeIntent(input: string): Promise<'MARKET_ANALYSIS' | 'NFT_CREATION'> {
    const input_lower = input.toLowerCase().trim();
    
    // Direct keyword matching for markets
    if (input_lower.includes('market') || 
        input_lower.includes('analyze') || 
        input_lower.includes('trade') || 
        input_lower.includes('dex')) {
      logger.info('Direct market analysis match');
      return 'MARKET_ANALYSIS';
    }
    
    // Direct keyword matching for NFTs
    if (input_lower.includes('nft') || 
        input_lower.includes('mint') || 
        input_lower.includes('create')) {
      logger.info('Direct NFT creation match');
      return 'NFT_CREATION';
    }

    // Default to market analysis if no clear match
    logger.info('No direct match, defaulting to market analysis');
    return 'MARKET_ANALYSIS';
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

  private getMemorySnapshot(): string[] {
    const snapshot = Array.from(this.moduleMemories.entries())
      .map(([name, memory]: [string, ModuleMemory]) => {
        return `${name}:\n${
          memory.recentActions
            .map((a: { timestamp: number; action: string }) => 
              `  ${new Date(a.timestamp).toLocaleString()}: ${a.action}`
            )
            .join('\n')
        }`;
      });
    return snapshot;
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

  private async handleDEXOperation(forceAction: boolean = false): Promise<void> {
    try {
      const dexModule = this.modules.get('DEX') as DexModule;
      if (!dexModule) {
        throw new Error('DEX module not found');
      }

      // Get market data first
      const validMarket = await dexModule.getMarketData('XPR_XMD');
      logger.info('Market data processed successfully', { validMarket });

      if (forceAction) {
        // Force the AI to make a trading decision
        const decision = await this.helper.discuss(
          `FORCED TRADE REQUIRED. Based on this market data:
          ${JSON.stringify(validMarket, null, 2)}
          
          You MUST choose either BUY or SELL - no skipping allowed.
          Consider:
          1. Price trends (${validMarket.ohlcv.price_change}% change)
          2. Volume (${validMarket.volume})
          3. Order book depth
          4. Recent trades
          
          IMPORTANT: You MUST respond with a trading decision - skipping is not allowed.
          Respond EXACTLY in this format:
          USE DEX placeOrder XPR_XMD {side} limit {quantity}`,
          { context: 'forced_trade' }
        );

        const [_, __, action, market, side, type, quantity] = decision.split(' ');
        await this.executeOperation({
          module: 'DEX',
          action: 'placeOrder',
          params: {
            marketSymbol: 'XPR_XMD',
            market_id: 1,
            side: side.toUpperCase(),
            type: type.toUpperCase(),
            order_type: OrderType.LIMIT,
            quantity: parseInt(quantity),
            price: validMarket.price,
            account: dexModule.account,
            trigger_price: "0.000000",
            fill_type: FillType.GTC
          }
        });
        return;
      }

      // Normal non-forced operation continues...
      const decision = await this.helper.discuss(
        `Analyze this market condition:
        ${JSON.stringify(validMarket, null, 2)}
        Consider:
        1. Price trends (${validMarket.ohlcv.price_change}% change)
        2. Volume (${validMarket.volume})
        3. Order book depth
        4. Recent trade patterns
        5. Support/resistance levels
        
        You MUST respond with a specific trading decision in EXACTLY this format:
        USE DEX placeOrder XPR_XMD {side} {type} {quantity}
        For example: USE DEX placeOrder XPR_XMD buy limit 1000
        If you don't recommend a trade, respond with: USE DEX skip`,
        { context: 'market_analysis' }
      );

      // Validate decision format
      const decisionPattern = /^USE DEX (placeOrder XPR_XMD (buy|sell) (market|limit) \d+|skip)$/i;
      if (!decisionPattern.test(decision)) {
        throw new Error('Invalid trading decision format from helper');
      }

      if (decision === 'USE DEX skip') {
        logger.info('No trading action recommended');
        return;
      }

      // Parse and execute the trading decision
      const [_, __, action, market, side, type, quantity] = decision.split(' ');
      const orderParams = {
        marketSymbol: 'XPR_XMD',
        market_id: 1,
        side: side.toUpperCase(),
        type: type.toUpperCase(),
        order_type: OrderType.LIMIT,
        quantity: parseInt(quantity),
        price: validMarket.price,
        account: dexModule.account,
        trigger_price: "0.000000",
        fill_type: FillType.GTC
      };

      await this.executeOperation({
        module: 'DEX',
        action: 'placeOrder',
        params: orderParams
      });

    } catch (error) {
      logger.error('DEX operation failed:', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async executeOperation(decision: AIDecision): Promise<void> {
    try {
      const module = this.modules.get(decision.module);
      if (!module) {
        throw new Error(`Module ${decision.module} not found`);
      }

      logger.info('Executing operation:', {
        module: decision.module,
        action: decision.action,
        params: decision.params
      });

      if (decision.module === 'DEX' && decision.action === 'placeOrder') {
        logger.info('Validating DEX order parameters...', decision.params);
        await this.validateDEXOrder(decision.params);
        
        // Execute the order and wait for blockchain confirmation
        const dexModule = module as DexModule;
        const result = await dexModule.execute(decision.action, decision.params);
        
        if (result.success && result.transaction_id) {
          const confirmed = await dexModule.getTransaction(result.transaction_id);
          
          // Type assertion to make TypeScript shut the fuck up
          const tx = confirmed as unknown as TransactionResult;

          if (!tx || !tx.processed) {
            throw new Error(`Transaction ${result.transaction_id} not confirmed`);
          }

          const traces = tx.processed.action_traces;
          const ordinalId = traces[0]?.inline_traces?.[0]?.data?.ordinal_order_id;
          
          if (ordinalId) {
            try {
              const lifecycle = await (dexModule as any).getOrderLifecycle(ordinalId);
              logger.info('Order lifecycle:', lifecycle);
            } catch (error) {
              logger.warn('Failed to get order lifecycle:', { ordinalId, error });
            }
          }

          logger.info('Order confirmed on blockchain:', { 
            txid: result.transaction_id,
            blockNum: tx.processed.block_num,
            ordinalId: ordinalId || null
          });
        } else {
          throw new Error('Order placement failed or no transaction ID returned');
        }
      }

      const result = await module.execute(decision.action, decision.params);
      
      if (result.success) {
        logger.info('Operation completed successfully:', {
          module: decision.module,
          action: decision.action,
          result: result.data
        });
      } else {
        logger.error('Operation failed:', {
          module: decision.module,
          action: decision.action,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Failed to execute operation:', {
        error: error instanceof Error ? error.message : String(error),
        module: decision.module,
        action: decision.action
      });
      throw error;
    }
  }

  private async validateDEXOrder(params: Record<string, unknown>): Promise<void> {
    const requiredParams = [
      'marketSymbol', 'side', 'type', 'quantity', 
      'price', 'market_id'
    ];
    
    const missingParams = requiredParams.filter(param => !params[param]);
    
    if (missingParams.length > 0) {
      throw new Error(`Missing required order parameters: ${missingParams.join(', ')}`);
    }

    if (typeof params.price !== 'number' || params.price <= 0) {
      throw new Error('Invalid price: must be a positive number');
    }

    if (typeof params.market_id !== 'number') {
      throw new Error('Invalid market_id: must be a number');
    }

    const validSides = ['BUY', 'SELL'];
    const validTypes = ['LIMIT', 'MARKET'];

    if (!validSides.includes(String(params.side).toUpperCase())) {
      throw new Error(`Invalid side: must be one of ${validSides.join(', ')}`);
    }

    if (!validTypes.includes(String(params.type).toUpperCase())) {
      throw new Error(`Invalid type: must be one of ${validTypes.join(', ')}`);
    }

    logger.info('Order parameters validated successfully', { params });
  }
}
