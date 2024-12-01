import { Agent } from './core/agent';
import { DexModule } from './modules/dex';
import { GeckoModule } from './modules/gecko';
import { Logger } from './core/logger';
import { initializeProtonApi } from './utils/proton';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const logger = new Logger();
  logger.info('Initializing agent...');

  const { api, rpc } = await initializeProtonApi();
  
  const agent = new Agent(process.env.OPENAI_API_KEY!, logger);
  
  // Register modules
  agent.registerModule(new DexModule(api, rpc));
  agent.registerModule(new GeckoModule(process.env.COINGECKO_API_KEY!));

  logger.info('Modules registered, starting main loop...');

  // Single test run
  await agent.executeLoop();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});