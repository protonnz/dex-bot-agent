// import { getConfig, getLogger } from './utils';
// import * as dexapi from './dexapi';
// import * as dexrpc from './dexrpc';
// import { getStrategy } from './strategies';
// import readline from 'readline';
// import { postSlackMsg } from './slackapi';

import 'dotenv/config'
import { ValidationBot } from "./channels/validation-bot";
import { Tables } from "./interfaces/db_scheme";
import {supabase} from "./utils/supabase-client";

console.log(process.env)
// function delay(ms: number) {
//   return new Promise((resolve) => {
//     setTimeout(resolve, ms);
//   });
// }

// const execTrade = async () => {
//   console.log('Bot is live');
//   await currentStrategy.trade()
//   await delay(config.tradeIntervalMS)
//   execTrade()
// }

// const execSlack = async () => {
//   await postSlackMsg()
//   await delay(config.slackIntervalMS)
//   execSlack()
// }
// const config = getConfig();
// const currentStrategy = getStrategy(config.strategy);
// currentStrategy.initialize(config[config.strategy]);

/**
 * Main
 * This sets up the logic for the application, the looping, timing, and what to do on exit.
 */
const main = async () => {

  const myBot = new ValidationBot(
    "7834300313:AAF_vpt--Miz2HqfWnhTsy3Zpx1JRp-_htw"
  );
  myBot.addReactionCallback(`🔥`,(ctx)=>ctx.reply('Whats funny ?'))
  myBot.addReactionCallback(`👀`,(ctx)=>ctx.reply('Short dick yourself'))
  myBot.startPolling();
  setTimeout(() => {
    myBot.sendMessage(-4505336166, `is this good ?`);
    
  },5000)

  supabase.channel("predictions").on(
    "postgres_changes",
    { event: "*", schema: "public", table: "prediction_ideas" },
    payload => {

      console.log('change')
      const newPred = payload.new as Tables<'prediction_ideas'>;
      myBot.sendMessage(-4505336166, JSON.stringify(newPred));


    }
  ).subscribe();
  // const logger = getLogger();

  // await dexapi.initialize();

  // try {
  //   process.stdin.resume();
  //   if (config.cancelOpenOrdersOnExit) {
  //     if (process.platform === "win32") {
  //       var rl = readline.createInterface({
  //         input: process.stdin,
  //         output: process.stdout
  //       });

  //       rl.on("SIGINT", function () {
  //         process.emit("SIGINT");
  //       });
  //     }

  //     async function signalHandler() {
  //       await dexrpc.cancelAllOrders();
  //       process.exit();
  //     }

  //     process.on('SIGINT', signalHandler)
  //     process.on('SIGTERM', signalHandler)
  //     process.on('SIGQUIT', signalHandler)
  //   }

  //   await currentStrategy.trade()
  //   logger.info(`Waiting for few seconds before fetching the placed orders`);
  //   await delay(15000)
  //   execTrade()
  //   execSlack()
  // } catch (error) {
  //   logger.error((error as Error).message);
  // }
};

// start it all up
await main();
