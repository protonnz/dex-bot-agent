import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { getLogger } from './logger';
import fs from 'fs/promises';

const logger = getLogger();

export class DatabaseManager {
  private dbPath: string;
  private db?: Database;

  constructor(moduleName: string) {
    this.dbPath = path.resolve(process.cwd(), 'data', '.memory', `${moduleName.toLowerCase()}.db`);
  }

  async initialize(): Promise<void> {
    try {
      const dbDir = path.dirname(this.dbPath);
      await fs.mkdir(dbDir, { recursive: true });
      
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      await this.createTables();
      logger.info(`Database initialized for path: ${this.dbPath}`);
    } catch (error) {
      logger.error('Failed to initialize database', { error });
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER
      );
    `);

    switch (path.basename(this.dbPath, '.db')) {
      case 'mint':
        await this.createMintTables();
        break;
      case 'image':
        await this.createImageTables();
        break;
      case 'dex':
        await this.createDexTables();
        break;
    }
  }

  private async createMintTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        display_name TEXT,
        description TEXT,
        created_at INTEGER,
        transaction_id TEXT
      );

      CREATE TABLE IF NOT EXISTS schemas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        collection_name TEXT,
        format TEXT,
        created_at INTEGER,
        transaction_id TEXT,
        FOREIGN KEY (collection_name) REFERENCES collections(name)
      );

      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY,
        name TEXT,
        collection_name TEXT,
        schema_name TEXT,
        description TEXT,
        image TEXT,
        created_at INTEGER,
        transaction_id TEXT,
        FOREIGN KEY (collection_name) REFERENCES collections(name)
      );

      CREATE TABLE IF NOT EXISTS minted_assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id TEXT UNIQUE,
        template_id INTEGER,
        collection_name TEXT,
        schema_name TEXT,
        owner TEXT,
        data TEXT,
        image_url TEXT,
        image_path TEXT,
        ipfs_hash TEXT,
        created_at INTEGER,
        transaction_id TEXT,
        FOREIGN KEY (template_id) REFERENCES templates(id),
        FOREIGN KEY (collection_name) REFERENCES collections(name)
      );
    `);
  }

  private async createImageTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS generated_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt TEXT,
        url TEXT,
        local_path TEXT,
        ipfs_hash TEXT,
        created_at INTEGER,
        used_for TEXT,
        parameters TEXT
      );

      CREATE TABLE IF NOT EXISTS image_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt TEXT,
        category TEXT,
        success_rate REAL,
        used_count INTEGER,
        last_used_at INTEGER
      );
    `);
  }

  private async createDexTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pair TEXT,
        type TEXT,
        amount REAL,
        price REAL,
        transaction_id TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pair TEXT,
        price REAL,
        volume REAL,
        timestamp INTEGER
      );
    `);
  }

  async get<T extends Record<string, any>>(query: string, params?: any[]): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');
    const results = await this.db.all(query, params);
    return results as T[];
  }

  async run(query: string, params?: any[]): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.run(query, params);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = undefined;
    }
  }
}
