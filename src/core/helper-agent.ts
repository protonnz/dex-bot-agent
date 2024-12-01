import OpenAI from 'openai';
import { getLogger } from './logger';

const logger = getLogger();

export class HelperAgent {
  private client: OpenAI;
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1'
    });
  }

  async discuss(topic: string, context: any): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'grok-beta',
        messages: [
          {
            role: 'system',
            content: 'You are a decision-making AI that helps choose between MINT and DEX modules. Respond ONLY with "USE MINT" or "USE DEX" based on the user\'s request. For anything related to creating or minting NFTs, choose MINT. For anything related to trading or exchanging, choose DEX.'
          },
          {
            role: 'user',
            content: `Based on this request, which module should we use: ${topic}`
          }
        ]
      });

      return response.choices[0]?.message?.content || 'No response from helper';
      
    } catch (error) {
      logger.error('Helper agent discussion failed', { error });
      throw error;
    }
  }
} 