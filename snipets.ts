//-----------------------------
// TG bot
const myBot = new ValidationBot(
  "7834300313:AAF_vpt--Miz2HqfWnhTsy3Zpx1JRp-_htw"
);
myBot.addReactionCallback(`🔥`,(ctx)=>ctx.reply('Whats funny ?'))
myBot.addReactionCallback(`👀`,(ctx)=>ctx.reply('Short dick yourself'))
myBot.startPolling();
setTimeout(() => {
  myBot.sendMessage(-4505336166, `On launch message`);
  
},5000)
//-----------------------------