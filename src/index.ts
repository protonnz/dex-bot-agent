import 'dotenv/config'
import { ValidationBot } from "./channels/validation-bot";
import { Tables } from "./interfaces/db_scheme";
import {supabase} from "./utils/supabase-client";

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
  }})
  
  myBot.startPolling();
  

  supabase.channel("predictions").on(
    "postgres_changes",
    { event: "*", schema: "public", table: "prediction_ideas" },
    payload => {
      const newPred = payload.new as Tables<'prediction_ideas'>;
      const message = `New Prediction\n **${newPred.title!}** - ${newPred.start}`;
      if (Object.keys(payload.old).length === 0) myBot.sendPrediction(-4505336166, message, newPred.image!, newPred.id);
      if (newPred.upvoters && newPred.upvoters.length >= 3)myBot.sendMessage(-4505336166, `${newPred.title} will be pushed on chain`);
      if (newPred.downvoters && newPred.downvoters.length >= 3)myBot.sendMessage(-4505336166, `${newPred.title} will DESTROYED !!!`);


    }
  ).subscribe();
  
};

// start it all up
await main();
