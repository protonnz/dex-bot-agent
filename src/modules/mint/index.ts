import { BaseModule } from '../base';
import { Api } from '@proton/js';
import { getLogger } from '../../core/logger';
import { 
  Collection, 
  Template, 
  MintAssetParams, 
  TransactResult, 
  ModuleActionResult 
} from './types';

interface CollectionParams {
  collection_name: string;
  display_name: string;
  description: string;
}

interface SchemaParams {
  collection_name: string;
  schema_name: string;
  schema_format: Array<{ name: string; type: string; }>;
}

interface TemplateParams {
  collection_name: string;
  schema_name: string;
  template: Template;
}

interface CreateSchemaParams {
  collection_name: string;
  schema_name: string;
  schema_format: Array<{ name: string; type: string; }>;
}

export class MintModule extends BaseModule {
  private api: Api | null = null;
  private account: string = '';
  private static readonly COLLECTION_NAME_REGEX = /^[a-z1-5]{1,12}$/;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 2000;

  constructor() {
    super(
      'MINT', 
      'Handles NFT minting operations',
      ['createNFT', 'createCollection', 'createTemplate', 'mintAsset', 'createSchema']
    );
  }

  public async initialize(): Promise<void> {
    await super.initialize();
  }

  public async initializeApi(api: Api, account: string): Promise<void> {
    if (!api || !account) {
      throw new Error('API and account are required for initialization');
    }
    this.api = api;
    this.account = account;
    getLogger().info('Mint module API initialized', { account });
  }

  private validateCollectionName(name: string): boolean {
    if (!MintModule.COLLECTION_NAME_REGEX.test(name)) {
      throw new Error('Invalid collection name. Must be 1-12 chars, only a-z1-5');
    }
    return true;
  }

  private generateCollectionName(): string {
    const name = 'ai' + Math.random().toString(36).substring(2, 6) + 
                Math.floor(Math.random() * 9000 + 1000).toString();
    this.validateCollectionName(name);
    return name;
  }

  protected async createCollection(params: CollectionParams): Promise<ModuleActionResult> {
    getLogger().info('Creating collection:', { collection: params.collection_name });
    
    if (!this.api) {
      throw new Error('API not initialized');
    }

    try {
      // First check if collection exists
      try {
        getLogger().debug('Checking if collection exists:', { collection: params.collection_name });
        
        const tableParams = {
          code: 'atomicassets',
          scope: 'atomicassets',
          table: 'collections',
          lower_bound: params.collection_name,
          upper_bound: params.collection_name,
          limit: 1,
          json: true
        };
        
        getLogger().debug('Table query params:', tableParams);
        
        const collection = await this.api.rpc.get_table_rows(tableParams);
        
        getLogger().debug('Collection query result:', { 
          collection,
          rowCount: collection.rows?.length,
          rows: collection.rows 
        });

        if (collection.rows?.length > 0) {
          const collectionData = collection.rows[0];
          getLogger().info('Collection already exists, reusing:', { 
            collection: params.collection_name,
            author: collectionData.author,
            data: collectionData 
          });
          
          // Check if we're authorized for this collection
          if (!collectionData.authorized_accounts.includes(this.account)) {
            throw new Error(`Account ${this.account} is not authorized for collection ${params.collection_name}`);
          }

          return {
            success: true,
            data: { 
              collection_name: params.collection_name,
              reused: true,
              collection_data: collectionData
            }
          };
        }

        getLogger().info('Collection does not exist, will create new one');
      } catch (err) {
        getLogger().warn('Failed to check collection existence', { 
          error: err instanceof Error ? err.message : String(err),
          details: err
        });
      }

      for (let attempt = 1; attempt <= MintModule.MAX_RETRIES; attempt++) {
        try {
          const action = {
            account: 'atomicassets',
            name: 'createcol',
            authorization: [{
              actor: this.account,
              permission: 'active',
            }],
            data: {
              author: this.account,
              collection_name: params.collection_name,
              allow_notify: true,
              authorized_accounts: [this.account],
              notify_accounts: [],
              market_fee: 0.05,
              data: [
                { key: 'name', value: ['string', params.display_name || params.collection_name] },
                { key: 'description', value: ['string', params.description || ''] },
              ]
            },
          };

          getLogger().debug('Sending createcol transaction', { action });

          const result = await this.api.transact(
            { actions: [action] },
            {
              blocksBehind: 3,
              expireSeconds: 30
            }
          ) as TransactResult;

          if (!result?.processed) {
            throw new Error('Transaction failed - no processed receipt');
          }

          getLogger().info('Collection created successfully', { 
            collection: params.collection_name,
            transaction: result.transactionId
          });

          return { 
            success: true,
            data: { collection_name: params.collection_name } 
          };

        } catch (err) {
          if (attempt < MintModule.MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, MintModule.RETRY_DELAY * attempt));
            continue;
          }
          throw err;
        }
      }
      throw new Error('Failed to create collection after maximum retries');
    } catch (error) {
      getLogger().error('Collection creation failed', { 
        error: error instanceof Error ? error.message : String(error),
        collection: params.collection_name
      });
      return {
        success: false,
        error: `Failed to create collection: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  protected async createSchema(params: CreateSchemaParams): Promise<ModuleActionResult> {
    try {
      if (!this.api) {
        throw new Error('API not initialized');
      }

      getLogger().info('Creating schema:', params);

      const action = {
        account: 'atomicassets',
        name: 'createschema',
        authorization: [{ actor: this.account, permission: 'active' }],
        data: {
          authorized_creator: this.account,
          collection_name: params.collection_name,
          schema_name: params.schema_name,
          schema_format: params.schema_format
        }
      };

      const result = await this.api.transact(
        { actions: [action] },
        {
          blocksBehind: 3,
          expireSeconds: 30
        }
      ) as TransactResult;

      getLogger().info('Schema created successfully', { 
        collection: params.collection_name,
        schema: params.schema_name,
        transaction_id: result.processed?.id || 'unknown'
      });

      return {
        success: true,
        data: { transaction_id: result.processed?.id || 'unknown' }
      };

    } catch (error) {
      getLogger().error('Schema creation error', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  protected async createTemplate(params: TemplateParams): Promise<ModuleActionResult> {
    try {
      if (!this.api) {
        throw new Error('API not initialized');
      }

      getLogger().info('Creating template:', { 
        collection: params.collection_name,
        schema: params.schema_name
      });

      getLogger().debug('Template creation params:', { 
        collection: params.collection_name,
        schema: params.schema_name
      });

      const action = {
        account: 'atomicassets',
        name: 'createtempl',
        authorization: [{ actor: this.account, permission: 'active' }],
        data: {
          authorized_creator: this.account,
          collection_name: params.collection_name,
          schema_name: params.schema_name,
          transferable: true,
          burnable: true,
          max_supply: 0,
          immutable_data: [
            { key: 'name', value: ['string', params.template.name] },
            { key: 'description', value: ['string', params.template.description] },
            { key: 'image', value: ['string', params.template.image] }
          ]
        }
      };

      getLogger().debug('Template action data:', action.data);

      for (let attempt = 1; attempt <= MintModule.MAX_RETRIES; attempt++) {
        try {
          const result = await this.api.transact(
            { actions: [action] },
            {
              blocksBehind: 3,
              expireSeconds: 30
            }
          ) as TransactResult;

          if (!result?.processed) {
            throw new Error('Transaction failed - no processed receipt');
          }

          // Extract template ID from action traces
          const templateId = result.processed?.action_traces?.[0]?.inline_traces?.[0]?.act?.data?.template_id;
          if (!templateId) {
            throw new Error('Template created but ID not found in transaction');
          }

          getLogger().info('Template created successfully', { 
            collection_name: params.collection_name,
            template_id: templateId
          });

          await this.recordAction('createTemplate', 'success', {
            collection_name: params.collection_name,
            template_id: templateId,
            transaction_id: result.transactionId
          });

          return {
            success: true,
            data: {
              template_id: templateId,
              transaction_id: result.transactionId
            }
          };

        } catch (error) {
          if (attempt < MintModule.MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, MintModule.RETRY_DELAY * attempt));
            continue;
          }
          throw error;
        }
      }
      throw new Error('Failed to create template after maximum retries');
    } catch (error) {
      getLogger().error('Template creation error', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  protected async mintAsset(params: MintAssetParams): Promise<ModuleActionResult> {
    try {
      if (!this.api) {
        throw new Error('API not initialized');
      }

      getLogger().info('Minting asset:', { 
        collection: params.collection_name,
        template: params.template_id
      });

      const action = {
        account: 'atomicassets',
        name: 'mintasset',
        authorization: [{ actor: this.account, permission: 'active' }],
        data: {
          authorized_minter: this.account,
          collection_name: params.collection_name,
          schema_name: params.schema_name,
          template_id: params.template_id,
          new_asset_owner: this.account,
          immutable_data: [
            { key: 'image', value: ['string', params.immutable_data.image] },
            ...params.immutable_data.attributes.map(attr => ({
              key: attr.key,
              value: ['string', attr.value]
            }))
          ],
          mutable_data: [],
          tokens_to_back: []
        }
      };

      for (let attempt = 1; attempt <= MintModule.MAX_RETRIES; attempt++) {
        try {
          const result = await this.api.transact(
            { actions: [action] },
            {
              blocksBehind: 3,
              expireSeconds: 30
            }
          ) as TransactResult;

          if (!result?.processed) {
            throw new Error('Transaction failed - no processed receipt');
          }

          // Extract asset ID from transaction
          const assetId = result.processed?.action_traces?.[0]?.inline_traces?.[0]?.act?.data?.asset_id;
          if (!assetId) {
            throw new Error('Asset minted but ID not found in transaction');
          }

          getLogger().info('Asset minted successfully', { 
            collection_name: params.collection_name,
            template_id: params.template_id,
            asset_id: assetId
          });

          await this.recordAction('mintAsset', 'success', {
            collection_name: params.collection_name,
            template_id: params.template_id,
            asset_id: assetId,
            transaction_id: result.transactionId
          });

          return {
            success: true,
            data: {
              asset_id: assetId,
              transaction_id: result.transactionId
            }
          };

        } catch (error) {
          if (attempt < MintModule.MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, MintModule.RETRY_DELAY * attempt));
            continue;
          }
          throw error;
        }
      }
      throw new Error('Failed to mint asset after maximum retries');
    } catch (error) {
      getLogger().error('Asset minting error', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  protected async recordAction(
    action: string, 
    status: 'success' | 'failure', 
    data: Record<string, any>
  ): Promise<void> {
    try {
      getLogger().info(`Recording action: ${action}`, { status, data });
    } catch (error) {
      getLogger().error('Failed to record action', { action, status, data, error });
    }
  }

  public async createNFT(params: {
    prompt: string;
    image: string;
    name?: string;
    description?: string;
  }): Promise<ModuleActionResult> {
    try {
        const collectionName = this.generateCollectionName();
        const schemaName = `s${Math.random().toString(36).substring(2, 14)}`;
        
        // 1. Create collection
        const collection = await this.createCollection({
            collection_name: collectionName,
            display_name: `AI Collection ${collectionName}`,
            description: 'AI Generated Art Collection'
        });

        if (!collection.success) {
            throw new Error(collection.error || 'Failed to create collection');
        }

        // 2. Create schema - Use the createSchema method instead of just defining the action
        getLogger().info('Creating schema...', { 
            collection_name: collectionName,
            schema_name: schemaName 
        });

        const schemaResult = await this.createSchema({
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

        getLogger().info('Schema created, waiting for blockchain confirmation...', {
            collection_name: collectionName,
            schema_name: schemaName,
            transaction_id: schemaResult.data.transaction_id
        });

        // Wait for blockchain to process schema creation
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 3. Create template with same schema name
        getLogger().info('Creating template...', {
            collection_name: collectionName,
            schema_name: schemaName
        });

        const template = await this.createTemplate({
            collection_name: collectionName,
            schema_name: schemaName,
            template: {
                name: params.name || 'AI Generated Art',
                description: params.description || 'Created with AI',
                image: params.image
            }
        });

        if (!template.success) {
            throw new Error(`Failed to create template: ${template.error}`);
        }

        // 4. Mint the asset
        const mintResult = await this.mintAsset({
            collection_name: collectionName,
            schema_name: schemaName,
            template_id: template.data.template_id,
            immutable_data: {
                image: params.image,
                attributes: [
                    { key: 'prompt', value: params.prompt },
                    { key: 'created_at', value: new Date().toISOString() }
                ]
            }
        });

        if (!mintResult.success) {
            throw new Error(mintResult.error || 'Failed to mint asset');
        }

        return {
            success: true,
            data: {
                collection_name: collectionName,
                template_id: template.data.template_id,
                asset_id: mintResult.data?.asset_id,
                transaction_id: mintResult.data?.transaction_id,
                image: params.image
            }
        };

    } catch (error) {
        getLogger().error('NFT creation failed', { error });
        return {
            success: false,
            error: `NFT creation failed: ${error instanceof Error ? error.message : String(error)}`
        };
    }
  }

  public async execute(action: string, params: any): Promise<ModuleActionResult> {
    switch (action) {
      case 'createCollection':
        return this.createCollection(params);
      case 'createTemplate':
        return this.createTemplate(params);
      case 'mintAsset':
        return this.mintAsset(params);
      case 'createNFT':
        return this.createNFT(params);
      case 'createSchema':
        return this.createSchema(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  public async getMemoryState(): Promise<any> {
    return {
      collections: [],
      templates: [],
      mintedAssets: []
    };
  }
}