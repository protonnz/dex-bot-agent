import { Api } from '@proton/js';
import { getLogger } from '../../core/logger';
import { DatabaseManager } from '../../core/database';
import { getUsername } from '../../core/config';
import { 
  Collection, 
  Schema, 
  Template, 
  MintAssetParams,
  AtomicAssetsResponse,
  ProtonTransactionResult,
  ModuleActionResult 
} from './types';
import { BaseModule } from '../base';
import { ModuleMemory } from '../../core/memory/types';

const logger = getLogger();

interface ProtonAction {
  account: string;
  name: string;
  authorization: Array<{
    actor: string;
    permission: string;
  }>;
  data: Record<string, any>;
}

interface ProtonTransactionRequest {
  actions: ProtonAction[];
  blocksBehind: number;
  expireSeconds: number;
}

export class MintModule extends BaseModule {
  private api: Api;
  protected db: DatabaseManager;
  private username: string;
  private account: string;
  private readonly transactionConfig = {
    blocksBehind: 3,
    expireSeconds: 30
  };

  constructor(api: Api) {
    super(
      'MINT',
      'Handles NFT minting operations',
      ['Create collections', 'Create templates', 'Mint NFTs']
    );
    this.api = api;
    this.username = getUsername();
    this.db = new DatabaseManager('mint');
    this.account = this.username;
  }

  async initialize(): Promise<void> {
    await super.initialize();
    await this.db.initialize();
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS collections (
        collection_name TEXT PRIMARY KEY,
        display_name TEXT,
        description TEXT,
        created_at INTEGER
      )
    `);
    // Add other tables as needed
  }

  async getRecentCollections(limit: number = 10): Promise<Collection[]> {
    const memory = await this.memory.get(this.name);
    if (!memory) return [];
    
    return memory.recentActions
      .filter((action: ModuleMemory['recentActions'][0]) => 
        action.action === 'createCollection' && action.result === 'success'
      )
      .slice(0, limit)
      .map((action: ModuleMemory['recentActions'][0]) => 
        action.metadata as Collection
      );
  }

  async getCollectionTemplates(collectionName: string): Promise<Template[]> {
    return this.db.get<Template>(
      'SELECT * FROM templates WHERE collection_name = ? ORDER BY created_at DESC',
      [collectionName]
    );
  }

  private async executeTransaction(transaction: ProtonTransactionRequest): Promise<ProtonTransactionResult> {
    try {
      const result = await this.api.transact(transaction);
      return result as unknown as ProtonTransactionResult;
    } catch (error) {
      logger.error('Transaction failed', { error });
      throw error;
    }
  }

  async createCollection(data: Collection): Promise<ModuleActionResult> {
    const timestamp = Date.now();
    try {
      logger.info(`Creating collection: ${data.collection_name}`);
      
      const action = {
        account: 'atomicassets',
        name: 'createcol',
        authorization: [{
          actor: this.account,
          permission: 'active',
        }],
        data: {
          author: this.account,
          collection_name: data.collection_name,
          allow_notify: true,
          authorized_accounts: [this.account],
          notify_accounts: [],
          market_fee: 0.05,
          data: [
            { key: 'name', value: ['string', data.display_name] },
            { key: 'description', value: ['string', data.description] }
          ]
        },
      };

      const result = await this.executeTransaction({
        actions: [action],
        blocksBehind: 3,
        expireSeconds: 30
      });

      await this.db.run(`
        INSERT INTO collections (name, display_name, description, created_at, transaction_id)
        VALUES (?, ?, ?, ?, ?)
      `, [
        data.collection_name,
        data.display_name,
        data.description,
        timestamp,
        result.transaction_id
      ]);

      return {
        type: 'createCollection',
        params: data,
        timestamp,
        success: true,
        data: {
          transaction_id: result.transaction_id,
          collection_name: data.collection_name
        }
      };
    } catch (error) {
      const err = error as Error;
      logger.error(`Collection creation error: ${err.message}`);
      return {
        type: 'createCollection',
        params: data,
        timestamp,
        success: false,
        error: err.message
      };
    }
  }

  async createSchema(data: Schema): Promise<ModuleActionResult> {
    const timestamp = Date.now();
    try {
      logger.info(`Creating schema: ${data.schema_name} for collection: ${data.collection_name}`);
      
      const action = {
        account: 'atomicassets',
        name: 'createschema',
        authorization: [{
          actor: this.username,
          permission: 'active',
        }],
        data: {
          authorized_creator: this.username,
          collection_name: data.collection_name,
          schema_name: data.schema_name,
          schema_format: data.schema_format
        },
      };

      const result = await this.executeTransaction({
        actions: [action],
        blocksBehind: 3,
        expireSeconds: 30
      });

      await this.db.run(`
        INSERT INTO schemas (name, collection_name, format, created_at, transaction_id)
        VALUES (?, ?, ?, ?, ?)
      `, [
        data.schema_name,
        data.collection_name,
        JSON.stringify(data.schema_format),
        timestamp,
        result.transaction_id
      ]);

      return {
        type: 'createSchema',
        params: data,
        timestamp,
        success: true,
        data: {
          transaction_id: result.transaction_id,
          schema_name: data.schema_name
        }
      };
    } catch (error) {
      const err = error as Error;
      logger.error(`Schema creation error: ${err.message}`);
      return {
        type: 'createSchema',
        params: data,
        timestamp,
        success: false,
        error: err.message
      };
    }
  }

  async createTemplate(data: Template): Promise<ModuleActionResult> {
    const timestamp = Date.now();
    try {
      logger.info(`Creating template for collection: ${data.collection_name}`);
      
      const action = {
        account: 'atomicassets',
        name: 'createtempl',
        authorization: [{
          actor: this.account,
          permission: 'active',
        }],
        data: {
          authorized_creator: this.account,
          collection_name: data.collection_name,
          schema_name: data.schema_name,
          transferable: true,
          burnable: true,
          max_supply: 0,
          immutable_data: [
            { key: 'name', value: ['string', data.name] },
            { key: 'description', value: ['string', data.description] },
            { key: 'image', value: ['string', data.image] },
            { key: 'artist', value: ['string', this.username] }
          ]
        },
      };

      const result = await this.executeTransaction({
        actions: [action],
        blocksBehind: 3,
        expireSeconds: 30
      });

      const templateId = parseInt(result.processed?.action_traces[0]?.return_value || '0');

      await this.db.run(`
        INSERT INTO templates (id, name, collection_name, schema_name, description, image, created_at, transaction_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        templateId,
        data.name,
        data.collection_name,
        data.schema_name,
        data.description,
        data.image,
        timestamp,
        result.transaction_id
      ]);

      return {
        type: 'createTemplate',
        params: data,
        timestamp,
        success: true,
        data: {
          transaction_id: result.transaction_id,
          template_id: templateId
        }
      };
    } catch (error) {
      const err = error as Error;
      logger.error(`Template creation error: ${err.message}`);
      return {
        type: 'createTemplate',
        params: data,
        timestamp,
        success: false,
        error: err.message
      };
    }
  }

  async execute(action: string, params: any): Promise<any> {
    switch (action) {
      case 'createCollection':
        const result = await this.createCollection(params);
        await this.recordAction('createCollection', 
          result.success ? 'success' : 'failure',
          { collection_name: params.collection_name }
        );
        return result;
      case 'createSchema':
        return this.createSchema(params as Schema);
      case 'createTemplate':
        return this.createTemplate(params as Template);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}
