import FormData from 'form-data';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import { getLogger } from './logger';

const logger = getLogger();

interface PinataConfig {
  pinataApiKey: string;
  pinataSecretKey: string;
}

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export async function pinFileToIPFS(filePath: string, config: PinataConfig): Promise<string> {
  try {
    const fileData = await fs.readFile(filePath);
    const formData = new FormData();
    
    formData.append('file', fileData, {
      filename: filePath.split('/').pop(),
      contentType: 'image/png',
    });

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': config.pinataApiKey,
        'pinata_secret_api_key': config.pinataSecretKey,
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to pin file: ${response.statusText}`);
    }

    const data = await response.json() as PinataResponse;
    return data.IpfsHash;
  } catch (error) {
    logger.error('Failed to pin file to IPFS', { error, filePath });
    throw error;
  }
} 