export interface ModuleActionResult {
  action: string;
  params: Record<string, unknown>;
  result: any;
  timestamp: number;
  status: 'success' | 'error';
} 