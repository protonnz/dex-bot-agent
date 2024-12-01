export class CoinGeckoClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.apiKey = apiKey || '';
  }

  async getPrice(coinId: string, vsCurrency: string = 'usd'): Promise<any> {
    const url = `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}&include_24hr_change=true`;
    const headers = this.apiKey ? { 'x-cg-pro-api-key': this.apiKey } : undefined;
    
    const response = await fetch(url, { headers });
    return response.json();
  }

  // Add other methods as needed
}
