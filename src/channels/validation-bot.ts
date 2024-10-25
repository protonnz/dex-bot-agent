import { Context, Markup } from 'telegraf';
import { BotBase } from './bot-base';
import { InlineKeyboardButton, Message } from 'telegraf/typings/core/types/typegram';


type InteractionButton = InlineKeyboardButton.CallbackButton & {
  callback:(ctx:Context,dataId:number)=>void
}

export class ValidationBot extends BotBase {

  private inlineKeyboardInteractions:InteractionButton[] = [];

  constructor(token: string) {
    super({ token });
    this.addCustomCommands();
    this.addVotingAction();
  }

  private addCustomCommands() {
    this.addCommand('hello', (ctx) => {
      ctx.reply('Hello, world!');
    });

    this.addTextResponse(/hi/i, (ctx) => {
      
        ctx.reply(`Hi there!`);
        
    });
  }

  private addVotingAction() { 

    this.bot.on('callback_query', (ctx) => {
      console.log(ctx.callbackQuery.from.username)
      const data = (ctx.callbackQuery as any).data;
      const raw = data.split(':')
      const action = raw[0];
      const id = raw[1];

      const existingKeyboardInteraction = this.inlineKeyboardInteractions.find((keyboardInteraction:InteractionButton) => keyboardInteraction.callback_data.startsWith(action));
      if (!existingKeyboardInteraction) return 
      existingKeyboardInteraction.callback(ctx,parseInt(id));
      //ctx.reply(`${ctx.callbackQuery.from.username} ${action} ${id}`)
    })

  }

  public registerVotingAction(triggerable: InteractionButton) {
    
    this.inlineKeyboardInteractions.push(triggerable);
    
  }

  public async sendPrediction(chatId: number | string, message: string,url:string,dataId?:number): Promise<Message.PhotoMessage | undefined> {
    try {
      
      const inlineKeyboard = Markup.inlineKeyboard([
        
        this.inlineKeyboardInteractions.map((interaction)=>{return {...interaction,callback_data:`${interaction.callback_data}:${dataId}`}}) 
      ]);
      console.log(`Message sent to chat: ${chatId}`);
      return this.bot.telegram.sendPhoto(chatId, {url:`https://betxpr.mypinata.cloud/ipfs/${url}`},{reply_markup:inlineKeyboard.reply_markup,caption:message});
    } catch (error) {
      console.error(`Failed to send message: ${error}`);
      return 
    }
  }

  public override async sendMessage(chatId: number | string, message: string, dataId?: number, withVotes?: boolean): Promise<Message.TextMessage> {
    const markups = [];
    if (withVotes && dataId) markups.push(this.inlineKeyboardInteractions.map((interaction)=>{return {...interaction,callback_data:`${interaction.callback_data}:${dataId}`}}) )
    const inlineKeyboard = Markup.inlineKeyboard(markups);
    return this.bot.telegram.sendMessage(chatId, message,{reply_markup: withVotes ? inlineKeyboard.reply_markup : undefined});
  }
}

