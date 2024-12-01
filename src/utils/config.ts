import { BotConfig } from '../interfaces';
import config from 'config';

export function getConfig(): BotConfig {
  return config.get('bot');
}

export function getUsername(): string {
  return process.env.PROTON_USERNAME || '';
}
