import 'dotenv/config'
import { ValidationBot } from "./channels/validation-bot";
import { Tables } from "./interfaces/db_scheme";
import {supabase} from "./utils/supabase-client";
import { InteractionButton } from './interfaces';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';
import dayjs from 'dayjs';

const main = async () => {

  const myBot = new ValidationBot(
    "7834300313:AAF_vpt--Miz2HqfWnhTsy3Zpx1JRp-_htw"
  );
  myBot.registerVotingAction({
    text: "👍", callback_data: "upvote", callback: async (ctx, id) => {
      if (!ctx.callbackQuery) return;
      if (!ctx.callbackQuery.from.username) return; 
      const { data, error } = await supabase.rpc('add_upvoter', { p_id: id, p_upvoter: ctx.callbackQuery.from.username });
  }})
  myBot.registerVotingAction({
    text: "👎", callback_data: "downvote", callback: async (ctx, id) => {
      if (!ctx.callbackQuery) return;
      if (!ctx.callbackQuery.from.username) return; 
      const { data, error } = await supabase.rpc('add_downvoter', { p_id: id, p_downvoter: ctx.callbackQuery.from.username });
    }
  })
  
  myBot.addTextResponse('preds', async (ctx) => {
    const { data, error } = await supabase.from('prediction_ideas').select('*').order('created_at', { ascending: false }).limit(10)
    if (error) ctx.reply('Crap i encounter shit in the fan while fetch preds ?');
    if (data) {
      if (data.length == 0) {
        ctx.reply('no preds ATM dude')
        
      }
      const titles = data.map((row):InlineKeyboardButton.CallbackButton => {
        return {
          text: `${row.title}`,
          callback_data: `preds:${row.id.toString()}`,
      };
      });
      myBot.sendPredictions(-4505336166,titles)
    }
    
  })

  myBot.setPredictionNavigationCallback(async (dataId: string) => {
    const { data, error } = await supabase.from('prediction_ideas').select('*').eq("id", dataId).single();
    if (!error) { 
      const message =  `<b>${data.title!}</b>\n\n${data.resolving_rules}\n\n${dayjs(data.start).format('DD/MM/YYYY HH:mm')}`;
      myBot.sendPrediction(-4505336166, message, data.image!, data.id);
    }
  })
  
  myBot.startPolling();
  

  supabase.channel("predictions").on(
    "postgres_changes",
    { event: "*", schema: "public", table: "prediction_ideas" },
    async (payload) => {
      const newPred = payload.new as Tables<'prediction_ideas'>;
      const message = `New Prediction\n **${newPred.title!}** - ${newPred.start}`;
      if (Object.keys(payload.old).length === 0) myBot.sendPrediction(-4505336166, message, newPred.image!, newPred.id);
      if (newPred.upvoters && newPred.upvoters.length >= 2)myBot.sendMessage(-4505336166, `${newPred.title} will be pushed on chain`);
      if (newPred.downvoters && newPred.downvoters.length >= 2) {
        const { data, error } = await supabase.from('prediction_ideas').delete().eq('id', newPred.id);
        if (data) myBot.sendMessage(-4505336166, `${newPred.title} has been deleted due to downvotes`)
      };


    }
  ).subscribe();
  
};

// start it all up
await main();
