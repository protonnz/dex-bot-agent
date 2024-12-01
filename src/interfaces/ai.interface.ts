export interface AIDecision {
  module: string;
  action: string;
  params: Record<string, unknown>;
  reasoning?: string;
}

export interface AIResponse {
  success: boolean;
  decision?: AIDecision;
  error?: string;
} 