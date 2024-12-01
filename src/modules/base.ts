import { getLogger } from '../core/logger';
import { MemoryManager } from '../core/memory/manager';
import { ModuleMemory, MemoryStore } from '../core/memory/types';

const logger = getLogger();

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface ModuleAction {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export abstract class BaseModule {
  protected readonly name: string;
  protected readonly description: string;
  protected readonly capabilities: string[];
  protected memory: MemoryStore<ModuleMemory>;
  private initialized: boolean = false;

  constructor(name: string, description: string, capabilities: string[] = []) {
    this.name = name;
    this.description = description;
    this.capabilities = capabilities;
    this.memory = new MemoryManager();
  }

  protected async validateAction(action: string): Promise<void> {
    logger.info(`Validating action on module ${this.name}`, {
      action,
      availableCapabilities: this.capabilities
    });

    if (!this.capabilities.includes(action)) {
      const error = `Unknown action: ${action}. Available actions: ${this.capabilities.join(', ')}`;
      logger.error(error, { module: this.name });
      throw new Error(error);
    }

    if (!this.initialized) {
      await this.initialize();
    }
  }

  abstract execute(action: string, params: any): Promise<any>;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.memory.initialize();
      this.initialized = true;
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize module ${this.name}: ${message}`);
    }
  }

  async getMemoryState(): Promise<ModuleMemory | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.memory.get(this.name);
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getCapabilities(): string[] {
    return [...this.capabilities];
  }

  protected async recordAction(action: string, result: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    await this.memory.updateModuleMemory(this.name, action, result, metadata);
  }
}
