import { Api, JsonRpc, JsSignatureProvider } from '@proton/js';
import { getConfig } from './core/config';
import { AgentGuide } from './core/agent-guide';
import { ImageModule } from './modules/image';
import { MintModule } from './modules/mint';
import { DexModule } from './modules/dex';
import { getLogger } from './core/logger';
import * as path from 'path';
import readline from 'readline';

const logger = getLogger();
const config = getConfig();

async function initializeAPI(): Promise<Api> {
  logger.info('Connecting to RPC endpoint:', { endpoint: config.rpcEndpoint });
  const rpc = new JsonRpc([config.rpcEndpoint]);
  const signatureProvider = new JsSignatureProvider([config.privateKey]);
  return new Api({ rpc, signatureProvider });
}

async function main() {
  try {
    logger.info('Initializing API...');
    const api = await initializeAPI();
    
    // TEST API CONNECTION
    try {
      const info = await api.rpc.get_info();
      logger.info('API Connected Successfully:', {
        chainId: info.chain_id,
        blockNum: info.head_block_num
      });
    } catch (apiError) {
      logger.error('API Connection Failed:', { error: apiError });
      process.exit(1);
    }

    // Initialize modules with proper configuration
    const imageConfig = {
      tempDir: path.join(process.cwd(), 'data', 'images'),
      pinataApiKey: process.env.PINATA_API_KEY!,
      pinataSecretKey: process.env.PINATA_SECRET_KEY!
    };

    const modules = {
      'IMAGE': new ImageModule(imageConfig),
      'MINT': new MintModule(),
      'DEX': new DexModule()
    };

    // Initialize DEX module with API FIRST
    const dexModule = modules.DEX as DexModule;
    try {
      // Set API and account properties using type assertion
      (dexModule as any).api = api;
      (dexModule as any).account = config.account;
      
      // Then initialize
      await dexModule.initialize();
      
      const testMarket = await dexModule.getMarketData('XPR_XMD');
      logger.info('DEX Module Test:', { 
        marketPrice: testMarket?.price,
        marketStatus: 'Connected'
      });
    } catch (dexError) {
      logger.error('DEX Module Failed:', { error: dexError });
      process.exit(1);
    }

    // Initialize MINT module with API
    try {
      await (modules.MINT as MintModule).initializeApi(api, config.account);
      logger.info('Mint module API initialized', { account: config.account });
    } catch (mintError) {
      logger.error('Mint Module Failed:', { error: mintError });
      process.exit(1);
    }

    // Create and initialize the guide
    const guide = new AgentGuide(modules);
    await guide.initialize();

    // Handle user input
    if (process.argv.includes('--auto')) {
      logger.info('Running in autonomous mode');
      await guide.start('', true);
    } else {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question('What would you like to do? (analyze markets/mint NFT): ', resolve);
      });

      rl.close();
      await guide.start(answer, false);
    }

  } catch (error) {
    logger.error('Critical error:', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name
    });
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Unhandled error in main:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    type: error?.constructor?.name
  });
  process.exit(1);
});