export interface ModuleAction {
  type: string;
  params: Record<string, any>;
  timestamp: number;
  success: boolean;
  error?: string;
  data?: unknown;
}

export abstract class BaseModule {
  protected name: string;
  protected description: string;
  protected capabilities: string[];

  constructor(name: string, description: string, capabilities: string[]) {
    this.name = name;
    this.description = description;
    this.capabilities = capabilities;
  }

  abstract execute(action: string, params: Record<string, any>): Promise<ModuleAction>;
  
  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return `
Module: ${this.name}
Description: ${this.description}
Capabilities:
${this.capabilities.map(cap => `- ${cap}`).join('\n')}
    `.trim();
  }
}
