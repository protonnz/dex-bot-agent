import { program } from 'commander';
import { createInterface } from 'readline';
import { AgentGuide } from './core/agent-guide';
import { DexModule } from './modules/dex';
import { ImageModule } from './modules/image';
import { MintModule } from './modules/mint';
import { CoinGeckoModule } from './modules/gecko';
import { getLogger } from './core/logger';
import { initializeApi } from './core/proton';
import { BaseModule } from './modules/base';
import { config } from './config';

const logger = getLogger();

async function startGuideMode(userIntent?: string) {
  logger.info('Starting guide mode...');
  
  try {
    logger.info('Initializing API...');
    const { api, rpc } = await initializeApi();
    
    logger.info('Setting up modules...');
    const modules: Record<string, BaseModule> = {
      'DEX': new DexModule(),
      'IMAGE': new ImageModule({
        model: config.modules.image.model,
        tempDir: config.modules.image.tempDir,
        pinataApiKey: process.env.PINATA_API_KEY || '',
        pinataSecretKey: process.env.PINATA_SECRET_KEY || ''
      }),
      'MINT': new MintModule(
        process.env.PROTON_USERNAME || '',
        config.api.endpoint
      ),
      'COINGECKO': new CoinGeckoModule()
    };

    const guide = new AgentGuide(modules);
    
    if (userIntent) {
      logger.info(`Processing direct intent: "${userIntent}"`);
      const response = await guide.executeIntent(userIntent);
      console.log('\n' + response + '\n');
      process.exit(0);
    }

    // Interactive mode
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('Welcome to the AI Agent Guide!\n');
    console.log('Here are my capabilities:');
    console.log(guide.getAllModuleCapabilities());
    console.log('\nTell me what you want to do, or type "exit" to quit.\n');

    const askQuestion = () => {
      rl.question('What would you like to do? > ', async (intent) => {
        if (intent.toLowerCase() === 'exit') {
          rl.close();
          process.exit(0);
        }

        const response = await guide.executeIntent(intent);
        console.log('\n' + response + '\n');
        askQuestion();
      });
    };

    askQuestion();
  } catch (err) {
    const error = err as Error;
    logger.error(`Failed to start guide mode: ${error.message}`);
    process.exit(1);
  }
}

// Parse command line arguments
program
  .option('-g, --guide [intent...]', 'Run in guide mode with optional direct intent')
  .parse(process.argv);

const options = program.opts();

if (options.guide) {
  logger.info('Guide mode triggered with:', options.guide);
  // If guide has arguments, join them into a single string
  const intent = Array.isArray(options.guide) ? options.guide.join(' ') : undefined;
  startGuideMode(intent);
} else {
  logger.info('Regular mode started');
}

if (!process.env.PROTON_USERNAME) {
  throw new Error('PROTON_USERNAME environment variable is required');
}