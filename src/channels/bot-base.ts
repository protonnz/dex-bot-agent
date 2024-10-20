import { Telegraf, Context, Scenes, session } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import { BaseScene, Stage } from 'telegraf/typings/scenes';


interface BotConfig {
  token: string;
  middlewares?: Array<(ctx: Context, next: () => Promise<void>) => Promise<void>>;
}

interface ReactionCallback {
  reaction: string;
  callback:(ctx:Context)=>void
}

interface ReactionSession extends Scenes.SceneSessionData {
  // You can store any data related to the scene here
  reaction?: string; // To store the emoji reaction in the session
}

interface ReactionSceneContext extends Context {
  scene: Scenes.SceneContextScene<ReactionSceneContext>;
  session: Scenes.SceneSession<ReactionSession>;
}

class BotBase {
  private bot: Telegraf<ReactionSceneContext>;
  private config: BotConfig;
  private reactionCallbacks: ReactionCallback[] = []
  

  constructor(config: BotConfig) {
    this.config = config;
    this.bot = new Telegraf<ReactionSceneContext>(config.token);
    
    this.initializeReactionsReply();
    this.initializeMiddlewares();
    this.initializeDefaultHandlers();
  }

  private initializeReactionsReply() { 
    
    this.bot.on('message_reaction', async (ctx) => {
      const update = ctx.update;
      const messageReaction = update.message_reaction;
      
      if (messageReaction) {
        const reaction = messageReaction.new_reaction[messageReaction.new_reaction.length - 1];
        if (!reaction) return;
        if (reaction.type == 'emoji') {
          const emoji = (reaction as any).emoji;
          if (emoji) {
            const foundCallback = this.reactionCallbacks.find((callback) => callback.reaction == emoji);
            if (foundCallback) {
              foundCallback.callback(ctx)
            }
          }
        }
      }
    });
  }

  // Initialize middlewares passed in the config
  private initializeMiddlewares(): void {
    if (this.config.middlewares) {
      this.config.middlewares.forEach((middleware) => {
        this.bot.use(middleware);
      });
    }
  }

  // init this shit
  private initializeDefaultHandlers(): void {
    this.bot.start((ctx) => ctx.reply('Welcome to the bot! Type /help for available commands.'));
    this.bot.help((ctx) => ctx.reply('Here is how to use the bot.'));
  }

  
  public addCommand(command: string, handler: (ctx: Context) => void): void {
    this.bot.command(command, handler);
  }

  
  public addTextResponse(trigger: string | RegExp, handler: (ctx: Context) => void): void {
    this.bot.hears(trigger, handler);
  }

  public addReactionCallback(reactiontrigger: string, callback: (ctx:Context) => void) {
    this.reactionCallbacks.push({
      reaction: reactiontrigger,
      callback
    })
  }

  

  // Programmatically send a message to a specific chat ID
  public async sendMessage(chatId: number | string, message: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, message);
      console.log(`Message sent to chat: ${chatId}`);
    } catch (error) {
      console.error(`Failed to send message: ${error}`);
    }
  }

  // Start the bot
  public startPolling(): void {
    this.bot.launch({
      allowedUpdates: ['message', 'message_reaction'], // Ensure the bot receives message reactions
    }).then(() => {
      console.log('Bot started polling');
    });
  }

  // Stop the bot
  public stop(): void {
    this.bot.stop('Bot stopped');
  }
}

export { BotBase };
