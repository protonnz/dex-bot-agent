import { Context, Markup } from 'telegraf';
import { BotBase } from './bot-base';
import { InlineKeyboardButton, Message } from 'telegraf/typings/core/types/typegram';


type InteractionButton = InlineKeyboardButton.CallbackButton & {
  callback:(ctx:Context,dataId:number)=>void
}

export class ValidationBot extends BotBase {

  private inlineKeyboardInteractions:InteractionButton[] = [];
  private predictionNavigationCallback:(dataId:string)=>void = (dataId:string)=>{};

  constructor(token: string) {
    super({ token });
    this.addCustomCommands();
    this.addVotingAction();
    this.addPredictionsNavigation();
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
      console.log(ctx.callbackQuery.from.username,'voting')
      const data = (ctx.callbackQuery as any).data;
      const raw = data.split(':')
      const action = raw[0];
      const id = raw[1];
      if (action == 'upvote' || action == 'downvote') {
        const existingKeyboardInteraction = this.inlineKeyboardInteractions.find((keyboardInteraction:InteractionButton) => keyboardInteraction.callback_data.startsWith(action));
      if (!existingKeyboardInteraction) return 
      existingKeyboardInteraction.callback(ctx,parseInt(id));  
      };
      if (action == 'preds') {
        this.predictionNavigationCallback(id)
        
      }
      
      //ctx.reply(`${ctx.callbackQuery.from.username} ${action} ${id}`)
    })

  }
  
  private addPredictionsNavigation() { 

    this.bot.on('callback_query', (ctx) => {
      console.log(ctx.callbackQuery.from.username,'cb')
      const data = (ctx.callbackQuery as any).data;
      const raw = data.split(':')
      const action = raw[0];
      const id = raw[1];
      console.log(raw);
     
    })

  }

  public setPredictionNavigationCallback(callback: (dataId:string) => {}): void {
    this.predictionNavigationCallback = callback
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
      return this.bot.telegram.sendPhoto(chatId, {url:url},{reply_markup:inlineKeyboard.reply_markup,caption:message,parse_mode:'HTML'});
    } catch (error) {
      console.error(`Failed to send message: ${error}`);
      return 
    }
  }
  
  public async sendPredictions(chatId: number | string, predictions: InlineKeyboardButton.CallbackButton[]): Promise<Message.TextMessage | undefined> {
    try {
      
      const buttons = predictions.map((prediction) => { return [{...prediction}] })
      const inlineKeyboard = Markup.inlineKeyboard(
        buttons
        
      );
      console.log(`Message sent to chat: ${chatId}`);
      return this.bot.telegram.sendMessage(chatId, 'Last predictions',{reply_markup:inlineKeyboard.reply_markup});
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

