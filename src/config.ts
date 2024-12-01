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
      model: 'owner/model-name',
      tempDir: './temp'
    },
    mint: {
      chainId: process.env.CHAIN_ID || 'proton',
      contractAddress: process.env.NFT_CONTRACT || 'atomicassets'
    }
  }
}; 