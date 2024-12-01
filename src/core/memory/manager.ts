import { DatabaseManager } from '../database';
import { MemoryStore, ModuleMemory, NFTModuleMemory } from './types';
import { getLogger } from '../logger';
import fs from 'fs/promises';
import path from 'path';

const logger = getLogger();

export class MemoryManager implements MemoryStore<ModuleMemory> {
  private db: DatabaseManager;
  private cache: Map<string, ModuleMemory>;
  private initialized: boolean = false;
  private nftMemoryPath: string;

  constructor() {
    this.db = new DatabaseManager('memory');
    this.cache = new Map();
    this.nftMemoryPath = path.resolve(process.cwd(), 'data', '.memory', 'nft_memory.json');
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize SQL database for module memory
      await this.db.initialize();
      await this.createTables();
      await this.loadCache();

      // Initialize file-based NFT memory
      await fs.mkdir(path.dirname(this.nftMemoryPath), { recursive: true });
      const exists = await fs.access(this.nftMemoryPath).then(() => true).catch(() => false);
      
      if (exists) {
        const data = await fs.readFile(this.nftMemoryPath, 'utf-8');
        const nftMemory = JSON.parse(data) as NFTModuleMemory['metadata'];
        this.cache.set('MINT', {
          moduleName: 'MINT',
          recentActions: [],
          metadata: nftMemory
        });
      } else {
        this.cache.set('MINT', {
          moduleName: 'MINT',
          recentActions: [],
          metadata: {
            collections: [],
            templates: [],
            mintedAssets: [],
            lastUpdated: Date.now()
          }
        });
        await this.saveNFTMemory();
      }

      this.initialized = true;
      logger.info('Memory manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize memory manager', { error });
      throw error;
    }
  }

  public async get(key: string): Promise<ModuleMemory | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (!this.cache.has(key)) {
        await this.loadMemory(key);
      }
      
      // If still no memory exists, create a new empty one
      if (!this.cache.has(key)) {
        const newMemory: ModuleMemory = {
          moduleName: key,
          recentActions: [],
          metadata: key === 'MINT' ? {
            collections: [],
            templates: [],
            mintedAssets: [],
            lastUpdated: Date.now()
          } : {}
        };
        this.cache.set(key, newMemory);
        await this.set(key, newMemory);
        logger.info(`Created new memory for module: ${key}`);
      }

      return this.cache.get(key) || null;
    } catch (error) {
      logger.error('Failed to get memory', { error, key });
      return null;
    }
  }

  public async set(key: string, value: ModuleMemory): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      this.cache.set(key, value);
      if (key === 'MINT') {
        await this.saveNFTMemory();
      } else {
        await this.saveMemory(key, value);
      }
    } catch (error) {
      logger.error('Failed to set memory', { error, key });
      throw error;
    }
  }

  public async getAll(): Promise<ModuleMemory[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return Array.from(this.cache.values());
  }

  public async clear(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      this.cache.clear();
      await this.db.run('DELETE FROM module_memories');
      await fs.writeFile(this.nftMemoryPath, JSON.stringify({
        collections: [],
        templates: [],
        mintedAssets: [],
        lastUpdated: Date.now()
      }, null, 2));
    } catch (error) {
      logger.error('Failed to clear memory', { error });
      throw error;
    }
  }

  public async updateModuleMemory(moduleName: string, action: string, result: string, metadata?: Record<string, any>): Promise<void> {
    const memory = await this.get(moduleName) || {
      moduleName,
      recentActions: [],
      metadata: {}
    };

    memory.recentActions.unshift({
      action,
      timestamp: Date.now(),
      result,
      metadata: metadata || {}
    });

    memory.recentActions = memory.recentActions.slice(0, 10);
    await this.set(moduleName, memory);
  }

  private async createTables(): Promise<void> {
    try {
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS module_memories (
          module_name TEXT PRIMARY KEY,
          recent_actions TEXT NOT NULL DEFAULT '[]',
          metadata TEXT NOT NULL DEFAULT '{}',
          updated_at INTEGER NOT NULL
        )
      `);
    } catch (error) {
      logger.error('Failed to create tables', { error });
      throw new Error('Failed to create memory tables');
    }
  }

  private async loadMemory(key: string): Promise<void> {
    if (key === 'MINT') {
      return; // MINT module memory is handled separately
    }

    try {
      const result = await this.db.get(
        'SELECT * FROM module_memories WHERE module_name = ?',
        [key]
      );
      if (result && result.length > 0) {
        const memory: ModuleMemory = {
          moduleName: result[0].module_name,
          recentActions: JSON.parse(result[0].recent_actions),
          metadata: JSON.parse(result[0].metadata)
        };
        this.cache.set(key, memory);
      }
    } catch (error) {
      logger.error('Failed to load memory', { error, key });
    }
  }

  private async saveMemory(key: string, value: ModuleMemory): Promise<void> {
    if (key === 'MINT') {
      return; // MINT module memory is handled separately
    }

    try {
      await this.db.run(
        `INSERT OR REPLACE INTO module_memories (module_name, recent_actions, metadata, updated_at)
         VALUES (?, ?, ?, ?)`,
        [
          key,
          JSON.stringify(value.recentActions),
          JSON.stringify(value.metadata),
          Date.now()
        ]
      );
    } catch (error) {
      logger.error('Failed to save memory', { error, key });
    }
  }

  private async saveNFTMemory(): Promise<void> {
    try {
      const memory = this.cache.get('MINT');
      if (memory) {
        await fs.writeFile(this.nftMemoryPath, JSON.stringify(memory.metadata, null, 2));
      }
    } catch (error) {
      logger.error('Failed to save NFT memory', { error });
      throw error;
    }
  }

  private async loadCache(): Promise<void> {
    try {
      const results = await this.db.get('SELECT * FROM module_memories');
      for (const row of results) {
        if (row.module_name === 'MINT') continue; // Skip MINT module as it's handled separately
        
        const memory: ModuleMemory = {
          moduleName: row.module_name,
          recentActions: JSON.parse(row.recent_actions),
          metadata: JSON.parse(row.metadata)
        };
        this.cache.set(row.module_name, memory);
      }
    } catch (error) {
      logger.error('Failed to load cache', { error });
      throw new Error('Failed to load memory cache');
    }
  }
}