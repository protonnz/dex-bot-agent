import { BotBase } from './bot-base';

export class ValidationBot extends BotBase {
  constructor(token: string) {
    super({ token });
    this.addCustomCommands();
  }

  private addCustomCommands() {
    this.addCommand('hello', (ctx) => {
      ctx.reply('Hello, world!');
    });

    this.addTextResponse(/hi/i, (ctx) => {
      
        ctx.reply(`Hi there!`);
        
      
    });
  }
}

