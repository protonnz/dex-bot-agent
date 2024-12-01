export interface MemoryStore<T> {
  initialize(): Promise<void>;
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  getAll(): Promise<T[]>;
  clear(): Promise<void>;
  updateModuleMemory(moduleName: string, action: string, result: string, metadata?: Record<string, any>): Promise<void>;
}

export interface ModuleMemory {
  moduleName: string;
  recentActions: {
    action: string;
    timestamp: number;
    result: string;
    metadata: Record<string, any>;
  }[];
  metadata: Record<string, any>;
}

export interface NFTModuleMemory extends ModuleMemory {
  metadata: {
    collections: Collection[];
    templates: Template[];
    mintedAssets: MintedAsset[];
    lastUpdated: number;
  };
}

export interface Collection {
  name: string;
  displayName: string;
  description: string;
  schemas: Schema[];
  createdAt: number;
  transactionId?: string;
}

export interface Schema {
  name: string;
  collectionName: string;
  format: SchemaFormat[];
  createdAt: number;
  transactionId?: string;
}

export interface Template {
  id: number;
  name: string;
  collectionName: string;
  schemaName: string;
  description: string;
  image: string;
  createdAt: number;
  transactionId?: string;
}

export interface MintedAsset {
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

export interface SchemaFormat {
  name: string;
  type: string;
} 