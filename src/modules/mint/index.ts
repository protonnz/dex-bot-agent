import { Api, JsonRpc, JsSignatureProvider } from '@proton/js';
import { BaseModule } from '../base';
import { Collection, Template, MintAssetParams, TransactionResult, TransactResult } from './types';
import { getLogger } from '../../core/logger';

const logger = getLogger();

export class MintModule extends BaseModule {
  private api: Api | null = null;
  private rpc: JsonRpc | null = null;
  private account: string;
  private readonly transactionConfig = {
    blocksBehind: 3,
    expireSeconds: 30
  };

  constructor(account: string, endpoint: string = 'https://api-xprnetwork-main.saltant.io') {
    if (!account) {
      throw new Error('Account name is required for MintModule');
    }

    super(
      'MINT',
      'Handles NFT minting operations',
      ['createCollection', 'createTemplate', 'mintAsset']
    );
    
    this.account = account;
    this.rpc = new JsonRpc(endpoint);
    this.initializeApi();
  }

  private async initializeApi() {
    if (!this.rpc) {
      throw new Error('RPC not initialized');
    }

    try {
      const privateKey = process.env.PROTON_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('PROTON_PRIVATE_KEY environment variable is required');
      }

      logger.info('Initializing API with account', { account: this.account });

      const signatureProvider = new JsSignatureProvider([privateKey]);

      this.api = new Api({
        rpc: this.rpc,
        signatureProvider
      });
      
      logger.info('API initialized for MintModule with account', { account: this.account });
    } catch (error) {
      logger.error('Failed to initialize API', { error });
      throw error;
    }
  }

  async execute(action: string, params: any): Promise<any> {
    await this.validateAction(action);

    if (!this.api) {
      await this.initializeApi();
    }

    switch (action) {
      case 'createCollection':
        return this.handleCreateCollection(params);
      case 'createTemplate':
        return this.handleCreateTemplate(params);
      case 'mintAsset':
        return this.handleMintAsset(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async handleCreateCollection(params: Collection): Promise<TransactionResult> {
    try {
      if (!this.api) {
        throw new Error('API not initialized');
      }

      logger.info(`Creating collection: ${params.collection_name}`);

      const action = {
        account: 'atomicassets',
        name: 'createcol',
        authorization: [{ actor: this.account, permission: 'active' }],
        data: {
          author: this.account,
          collection_name: params.collection_name,
          allow_notify: true,
          authorized_accounts: [this.account],
          notify_accounts: [],
          market_fee: 0.05,
          data: [
            { key: 'name', value: ['string', params.display_name] },
            { key: 'description', value: ['string', params.description] }
          ]
        }
      };

      const result = await this.api.transact(
        { actions: [action] },
        {
          blocksBehind: this.transactionConfig.blocksBehind,
          expireSeconds: this.transactionConfig.expireSeconds
        }
      ) as TransactResult;

      await this.recordAction('createCollection', 'success', {
        collection_name: params.collection_name,
        transaction_id: result.transaction_id
      });

      return {
        success: true,
        transactionId: result.transaction_id
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Collection creation error', { error: errorMessage });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async createSchema(collectionName: string): Promise<TransactionResult> {
    try {
      if (!this.api) {
        throw new Error('API not initialized');
      }

      logger.info(`Creating schema for collection: ${collectionName}`);

      const action = {
        account: 'atomicassets',
        name: 'createschema',
        authorization: [{ actor: this.account, permission: 'active' }],
        data: {
          authorized_creator: this.account,
          collection_name: collectionName,
          schema_name: 'ai.art',
          schema_format: [
            { name: 'name', type: 'string' },
            { name: 'description', type: 'string' },
            { name: 'image', type: 'string' },
            { name: 'attributes', type: 'string[]' }
          ]
        }
      };

      const result = await this.api.transact(
        { actions: [action] },
        this.transactionConfig
      ) as TransactResult;

      logger.info('Schema created successfully', { 
        collection_name: collectionName,
        schema_name: 'ai.art'
      });

      return {
        success: true,
        transactionId: result.transaction_id
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Schema creation error', { error: errorMessage });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async handleCreateTemplate(params: any): Promise<TransactionResult> {
    try {
      if (!this.api) {
        throw new Error('API not initialized');
      }

      // Create schema first
      const schemaResult = await this.createSchema(params.collection_name);
      if (!schemaResult.success) {
        throw new Error(`Failed to create schema: ${schemaResult.error}`);
      }

      logger.info(`Creating template for collection: ${params.collection_name}`);

      const action = {
        account: 'atomicassets',
        name: 'createtempl',
        authorization: [{ actor: this.account, permission: 'active' }],
        data: {
          authorized_creator: this.account,
          collection_name: params.collection_name,
          schema_name: 'ai.art',
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

      const result = await this.api.transact(
        { actions: [action] },
        this.transactionConfig
      ) as TransactResult;

      // Extract template ID from action traces
      const templateId = result.processed?.action_traces?.[0]?.inline_traces?.[0]?.act?.data?.template_id;
      
      if (!templateId) {
        logger.error('Template creation succeeded but no template ID in result', { result });
        throw new Error('Template created but ID not found in transaction');
      }

      logger.info('Template created successfully', { 
        collection_name: params.collection_name,
        template_id: templateId
      });

      await this.recordAction('createTemplate', 'success', {
        collection_name: params.collection_name,
        template_id: templateId,
        transaction_id: result.transaction_id
      });

      return {
        success: true,
        transactionId: result.transaction_id,
        data: {
          template_id: templateId
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Template creation error', { error: errorMessage });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async handleMintAsset(params: MintAssetParams): Promise<TransactionResult> {
    try {
      if (!this.api) {
        throw new Error('API not initialized');
      }

      logger.info(`Minting asset from template: ${params.template_id}`);

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

      const result = await this.api.transact(
        { actions: [action] },
        {
          blocksBehind: this.transactionConfig.blocksBehind,
          expireSeconds: this.transactionConfig.expireSeconds
        }
      ) as TransactResult;

      await this.recordAction('mintAsset', 'success', {
        collection_name: params.collection_name,
        template_id: params.template_id,
        transaction_id: result.transaction_id
      });

      return {
        success: true,
        transactionId: result.transaction_id
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Asset minting error', { error: errorMessage });
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
