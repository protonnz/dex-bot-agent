import { Api, JsonRpc, JsSignatureProvider } from '@proton/js';
import { getConfig } from './core/config';
import { AgentGuide } from './core/agent-guide';
import { BaseModule } from './modules/base';
import { MintModule } from './modules/mint';
import { ImageModule } from './modules/image';
import { DexModule } from './modules/dex';
import { getLogger } from './core/logger';
import * as readline from 'readline';

const logger = getLogger();
const config = getConfig();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  try {
    logger.info('Initializing API...');
    
    // Initialize signature provider with private key
    const privateKey = process.env.PROTON_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PROTON_PRIVATE_KEY not found in environment variables');
    }
    const signatureProvider = new JsSignatureProvider([privateKey]);
    
    // Initialize API with JsonRpc instance and signature provider
    const rpc = new JsonRpc(config.api.endpoint);
    const api = new Api({ 
      rpc,
      signatureProvider
    });
    
    logger.info(`Connecting to RPC endpoint: ${config.api.endpoint}`);
    
    // Initialize modules with proper constructor arguments
    const modules: Record<string, BaseModule> = {
      'IMAGE': new ImageModule({
        tempDir: config.modules.image.tempDir,
        pinataApiKey: config.modules.image.pinataApiKey,
        pinataSecretKey: config.modules.image.pinataSecretKey,
      }),
      'MINT': new MintModule(),
      'DEX': new DexModule()
    };

    // Initialize the API for the MintModule before starting the guide
    await (modules['MINT'] as MintModule).initializeApi(api, config.api.account || '');

    // Initialize guide
    const guide = new AgentGuide(modules);
    await guide.initialize();

    // Prompt user for input
    rl.question('What would you like to do? (analyze markets/mint NFT): ', async (input) => {
      try {
        await guide.start(input);
        rl.close();
      } catch (error) {
        logger.error('Error processing input', { error });
        rl.close();
      }
    });

  } catch (error) {
    logger.error('Failed to start guide mode:', error);
    rl.close();
    process.exit(1);
  }
}

main();