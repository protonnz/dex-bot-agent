import { Context } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';

export type InteractionButton = InlineKeyboardButton.CallbackButton & {
  callback:(ctx:Context,dataId:number)=>void
}

export * from './config.interface';
export * from './strategy.interface';
export * from './order.interface';