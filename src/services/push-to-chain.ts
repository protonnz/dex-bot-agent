import { Api, JsonRpc, JsSignatureProvider } from "@proton/js";
import {betxpr} from "../interfaces/betxpr";
import {Tables} from "../interfaces/db_scheme";
import {xtokens} from "../interfaces/xtokens";
import dayjs from "dayjs";

export function generateTransaction(
  predictionIdea: Tables<"prediction_ideas">
) {
  const transferAction = xtokens.transfer(
    [{actor: "betagent", permission: "active"}],
    {from: "betagent", to: "betxpr", quantity: "10.0000 XPR", memo: ""}
  );
  const createPredictionAction = betxpr.pred_crt(
    [{actor: "betagent", permission: "active"}],
    {
      title: predictionIdea.title!,
      answers: predictionIdea.answers!,
      category: predictionIdea.category!,
      image: predictionIdea.image!,
      limitToAccount: [],
      owner: "betagent",
      start: dayjs(predictionIdea.start).unix()*1000, //Need timestemp conversion
      end: dayjs(predictionIdea.end).unix()*1000, //Need timestemp conversion
      stake: "10.0000 XPR",
      resolvingRules: predictionIdea.resolving_rules!,
      resolvingUrl: predictionIdea.resolving_url!,
      validatorsSeeds: [],
    }
  );
  const seedBetAction = betxpr.bet_last(
    [{actor: "betagent", permission: "active"}],
    {account: "betagent", answers: 0}
  );

  return [transferAction, createPredictionAction, seedBetAction];
}

export async function doTransaction(transaction: any[]) {

  const rpc = new JsonRpc(['https://testnet.rockerone.io']);
  const signatureProvider = new JsSignatureProvider(['']);
  const api = new Api({ rpc, signatureProvider })
  return await api.transact({actions:transaction},{blocksBehind:3,expireSeconds:30,broadcast:true})
  
}
