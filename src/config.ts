export interface Config {
  api: {
    endpoint: string;
    readOnly: boolean;
  };
  modules: {
    image: {
      model: string;
      tempDir: string;
    };
    mint: {
      chainId: string;
      contractAddress: string;
    };
  };
}

export const config: Config = {
  api: {
    endpoint: process.env.RPC_ENDPOINT || 'https://api-xprnetwork-main.saltant.io',
    readOnly: process.env.READ_ONLY === 'true'
  },
  modules: {
    image: {
      model: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      tempDir: 'data/images'
    },
    mint: {
      chainId: process.env.CHAIN_ID || 'proton',
      contractAddress: process.env.NFT_CONTRACT || 'atomicassets'
    }
  }
}; 