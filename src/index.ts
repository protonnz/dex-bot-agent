import { Api, JsonRpc, JsSignatureProvider } from '@proton/js';
import { getConfig } from './core/config';
import { AgentGuide } from './core/agent-guide';
import { BaseModule } from './modules/base';
import { MintModule } from './modules/mint';
import { ImageModule } from './modules/image';
import { getLogger } from './core/logger';

const logger = getLogger();
const config = getConfig();

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
      'MINT': new MintModule()
    };

    // Initialize the API for the MintModule before starting the guide
    await (modules['MINT'] as MintModule).initializeApi(api, config.api.account || '');

    // Initialize guide with intent
    const guide = new AgentGuide(modules);
    await guide.start("mint an nft");

  } catch (error) {
    logger.error('Failed to start guide mode:', error);
    process.exit(1);
  }
}

main();