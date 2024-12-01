import fs from 'fs/promises';
import path from 'path';
import { getLogger } from './logger';

const logger = getLogger();

interface NFTMemory {
  collections: Collection[];
  templates: Template[];
  mintedAssets: MintedAsset[];
  lastUpdated: number;
}

interface Collection {
  name: string;
  displayName: string;
  description: string;
  schemas: Schema[];
  createdAt: number;
  transactionId?: string;
}

interface Schema {
  name: string;
  collectionName: string;
  format: SchemaFormat[];
  createdAt: number;
  transactionId?: string;
}

interface Template {
  id: number;
  name: string;
  collectionName: string;
  schemaName: string;
  description: string;
  image: string;
  createdAt: number;
  transactionId?: string;
}

interface MintedAsset {
  assetId: string;
  templateId: number;
  collectionName: string;
  schemaName: string;
  owner: string;
  data: Record<string, any>;
  image: {
    url: string;
    localPath: string;
    ipfsHash: string;
  };
  createdAt: number;
  transactionId?: string;
}

interface SchemaFormat {
  name: string;
  type: string;
}

export class MemoryManager {
  private memoryPath: string;
  private memory: NFTMemory;

  constructor() {
    this.memoryPath = path.resolve(process.cwd(), 'data', '.memory', 'nft_memory.json');
    this.memory = {
      collections: [],
      templates: [],
      mintedAssets: [],
      lastUpdated: Date.now()
    };
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.memoryPath), { recursive: true });
      const exists = await fs.access(this.memoryPath).then(() => true).catch(() => false);
      
      if (exists) {
        const data = await fs.readFile(this.memoryPath, 'utf-8');
        this.memory = JSON.parse(data);
        logger.info('Memory loaded successfully');
      } else {
        await this.save();
        logger.info('New memory file created');
      }
    } catch (err) {
      logger.error('Failed to initialize memory:', err);
      throw err;
    }
  }

  private async save(): Promise<void> {
    this.memory.lastUpdated = Date.now();
    await fs.writeFile(this.memoryPath, JSON.stringify(this.memory, null, 2));
    logger.info('Memory saved successfully');
  }

  async addCollection(collection: Collection): Promise<void> {
    this.memory.collections.push(collection);
    await this.save();
  }

  async addTemplate(template: Template): Promise<void> {
    this.memory.templates.push(template);
    await this.save();
  }

  async addMintedAsset(asset: MintedAsset): Promise<void> {
    this.memory.mintedAssets.push(asset);
    await this.save();
  }

  getCollections(): Collection[] {
    return this.memory.collections;
  }

  getTemplates(collectionName?: string): Template[] {
    if (collectionName) {
      return this.memory.templates.filter(t => t.collectionName === collectionName);
    }
    return this.memory.templates;
  }

  getMintedAssets(collectionName?: string): MintedAsset[] {
    if (collectionName) {
      return this.memory.mintedAssets.filter(a => a.collectionName === collectionName);
    }
    return this.memory.mintedAssets;
  }

  getRecentCollection(): Collection | undefined {
    return this.memory.collections[this.memory.collections.length - 1];
  }

  getRecentTemplate(): Template | undefined {
    return this.memory.templates[this.memory.templates.length - 1];
  }

  findCollectionByName(name: string): Collection | undefined {
    return this.memory.collections.find(c => c.name === name);
  }

  findTemplateById(id: number): Template | undefined {
    return this.memory.templates.find(t => t.id === id);
  }

  async summarize(): Promise<string> {
    const summary = [
      `Total Collections: ${this.memory.collections.length}`,
      `Total Templates: ${this.memory.templates.length}`,
      `Total Minted Assets: ${this.memory.mintedAssets.length}`,
      `Last Updated: ${new Date(this.memory.lastUpdated).toLocaleString()}`,
      '\nRecent Activity:',
      ...this.memory.mintedAssets.slice(-3).map(asset => 
        `- Minted "${asset.data.name}" from template ${asset.templateId} (${new Date(asset.createdAt).toLocaleString()})`
      )
    ];

    return summary.join('\n');
  }
}
