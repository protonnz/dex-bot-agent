type betxpr_Actions = {
  "bal.wthdrw": {
    account:string;
    symbol:string;
    contract:string
  },
  "bet.last": {
    account:string;
    answers:number
  },
  "bet.sub": {
    account:string;
    predictionKey:number;
    answers:number;
    quantity:number
  },
  "dev.accrst": {
    
  },
  "dev.clrbal": {
    account:string;
    symbol:string
  },
  "dev.clrprds": {
    
  },
  "dev.clrprds": {
    
  },
  "dev.pollsz": {
    predictionKey:number;
    count:number
  },
  "dev.prdrmv": {
    predictionKey:number
  },
  "dev.prdsts": {
    predictionKey:number;
    status:string
  },
  "dev.relacc": {
    pollKey:number
  },
  "dev.revxpr": {
    
  },
  "dev.rstprds": {
    predictionKey:number
  },
  "dev.upimg": {
    predictionKey:number;
    image:string
  },
  "gov.clsepoll": {
    predictionKey:number
  },
  "gov.endpoll": {
    predictionKey:number
  },
  "gov.openpoll": {
    predictionKey:number
  },
  "gov.pollupdt": {
    pollKey:number;
    title:string;
    answers:string[];
    ticket:string;
    poolStart:number;
    poolEnd:number;
    image:string
  },
  "gov.setfees": {
    name:string;
    fees:number
  },
  "gov.setres": {
    predictionKey:number;
    result:number
  },
  "gov.updend": {
    predictionKey:number;
    endTime:number
  },
  "pred.blame": {
    account:string;
    predictionKey:number
  },
  "pred.cancel": {
    account:string;
    predictionKey:number
  },
  "pred.close": {
    
  },
  "pred.crt": {
    owner:string;
    title:string;
    answers:string[];
    stake:string;
    validatorsSeeds:number[];
    start:number;
    end:number;
    limitToAccount:string[];
    image:string;
    category:number;
    resolvingUrl:string;
    resolvingRules:string
  },
  "rslvr.req": {
    requester:string;
    predictionKey:number
  }
}

export const betxpr = {
  bal_wthdrw:(authorization:Authorization[],data:betxpr_Actions['bal.wthdrw']):XPRAction<'bal.wthdrw'>=>({
	account:'betxpr',
	name:'bal.wthdrw',
	authorization,
data}),
 bet_last:(authorization:Authorization[],data:betxpr_Actions['bet.last']):XPRAction<'bet.last'>=>({
	account:'betxpr',
	name:'bet.last',
	authorization,
data}),
 bet_sub:(authorization:Authorization[],data:betxpr_Actions['bet.sub']):XPRAction<'bet.sub'>=>({
	account:'betxpr',
	name:'bet.sub',
	authorization,
data}),
 dev_accrst:(authorization:Authorization[],data:betxpr_Actions['dev.accrst']):XPRAction<'dev.accrst'>=>({
	account:'betxpr',
	name:'dev.accrst',
	authorization,
data}),
 dev_clrbal:(authorization:Authorization[],data:betxpr_Actions['dev.clrbal']):XPRAction<'dev.clrbal'>=>({
	account:'betxpr',
	name:'dev.clrbal',
	authorization,
data}),
 dev_clrprds:(authorization:Authorization[],data:betxpr_Actions['dev.clrprds']):XPRAction<'dev.clrprds'>=>({
	account:'betxpr',
	name:'dev.clrprds',
	authorization,
data}),
 dev_clrprds:(authorization:Authorization[],data:betxpr_Actions['dev.clrprds']):XPRAction<'dev.clrprds'>=>({
	account:'betxpr',
	name:'dev.clrprds',
	authorization,
data}),
 dev_pollsz:(authorization:Authorization[],data:betxpr_Actions['dev.pollsz']):XPRAction<'dev.pollsz'>=>({
	account:'betxpr',
	name:'dev.pollsz',
	authorization,
data}),
 dev_prdrmv:(authorization:Authorization[],data:betxpr_Actions['dev.prdrmv']):XPRAction<'dev.prdrmv'>=>({
	account:'betxpr',
	name:'dev.prdrmv',
	authorization,
data}),
 dev_prdsts:(authorization:Authorization[],data:betxpr_Actions['dev.prdsts']):XPRAction<'dev.prdsts'>=>({
	account:'betxpr',
	name:'dev.prdsts',
	authorization,
data}),
 dev_relacc:(authorization:Authorization[],data:betxpr_Actions['dev.relacc']):XPRAction<'dev.relacc'>=>({
	account:'betxpr',
	name:'dev.relacc',
	authorization,
data}),
 dev_revxpr:(authorization:Authorization[],data:betxpr_Actions['dev.revxpr']):XPRAction<'dev.revxpr'>=>({
	account:'betxpr',
	name:'dev.revxpr',
	authorization,
data}),
 dev_rstprds:(authorization:Authorization[],data:betxpr_Actions['dev.rstprds']):XPRAction<'dev.rstprds'>=>({
	account:'betxpr',
	name:'dev.rstprds',
	authorization,
data}),
 dev_upimg:(authorization:Authorization[],data:betxpr_Actions['dev.upimg']):XPRAction<'dev.upimg'>=>({
	account:'betxpr',
	name:'dev.upimg',
	authorization,
data}),
 gov_clsepoll:(authorization:Authorization[],data:betxpr_Actions['gov.clsepoll']):XPRAction<'gov.clsepoll'>=>({
	account:'betxpr',
	name:'gov.clsepoll',
	authorization,
data}),
 gov_endpoll:(authorization:Authorization[],data:betxpr_Actions['gov.endpoll']):XPRAction<'gov.endpoll'>=>({
	account:'betxpr',
	name:'gov.endpoll',
	authorization,
data}),
 gov_openpoll:(authorization:Authorization[],data:betxpr_Actions['gov.openpoll']):XPRAction<'gov.openpoll'>=>({
	account:'betxpr',
	name:'gov.openpoll',
	authorization,
data}),
 gov_pollupdt:(authorization:Authorization[],data:betxpr_Actions['gov.pollupdt']):XPRAction<'gov.pollupdt'>=>({
	account:'betxpr',
	name:'gov.pollupdt',
	authorization,
data}),
 gov_setfees:(authorization:Authorization[],data:betxpr_Actions['gov.setfees']):XPRAction<'gov.setfees'>=>({
	account:'betxpr',
	name:'gov.setfees',
	authorization,
data}),
 gov_setres:(authorization:Authorization[],data:betxpr_Actions['gov.setres']):XPRAction<'gov.setres'>=>({
	account:'betxpr',
	name:'gov.setres',
	authorization,
data}),
 gov_updend:(authorization:Authorization[],data:betxpr_Actions['gov.updend']):XPRAction<'gov.updend'>=>({
	account:'betxpr',
	name:'gov.updend',
	authorization,
data}),
 pred_blame:(authorization:Authorization[],data:betxpr_Actions['pred.blame']):XPRAction<'pred.blame'>=>({
	account:'betxpr',
	name:'pred.blame',
	authorization,
data}),
 pred_cancel:(authorization:Authorization[],data:betxpr_Actions['pred.cancel']):XPRAction<'pred.cancel'>=>({
	account:'betxpr',
	name:'pred.cancel',
	authorization,
data}),
 pred_close:(authorization:Authorization[],data:betxpr_Actions['pred.close']):XPRAction<'pred.close'>=>({
	account:'betxpr',
	name:'pred.close',
	authorization,
data}),
 pred_crt:(authorization:Authorization[],data:betxpr_Actions['pred.crt']):XPRAction<'pred.crt'>=>({
	account:'betxpr',
	name:'pred.crt',
	authorization,
data}),
 rslvr_req:(authorization:Authorization[],data:betxpr_Actions['rslvr.req']):XPRAction<'rslvr.req'>=>({
	account:'betxpr',
	name:'rslvr.req',
	authorization,
data}) 
} 
type betxpr_Tables = {
  "AccountTable": {
    key:number;
    name:string;
    blameCount:number;
    isBlackListed:boolean
  },
  "BalanceTable": {
    key:number;
    amount:string
  },
  "BetTable": {
    key:number;
    account:string;
    answer:number;
    count:number;
    status:number
  },
  "BlacklistTable": {
    account:string
  },
  "BlamesTable": {
    pollKey:number
  },
  "ConfigTable": {
    name:string;
    value:number
  },
  "PredictionTable": {
    key:number;
    owner:string;
    title:string;
    answers:string[];
    stake:string;
    validators:string[];
    result:number;
    start:number;
    end:number;
    size:number;
    limitToAccounts:string[];
    image:string;
    blame:number;
    blameThreshold:number;
    status:string;
    category:number;
    resolvingUrl:string;
    resolvingRules:string
  }
}


    export type Authorization = {
      actor: string;
      permission: "active"|"owner"|string;
  }

    export type XPRAction<A extends keyof (betxpr_Actions)>={
      account: 'betxpr';
      name: A;
      authorization: Authorization[];
      data: betxpr_Actions[A]; 
    }
  
export type Tables<TableName extends keyof (betxpr_Tables)> = betxpr_Tables[TableName];
export type Actions<ActionName extends keyof (betxpr_Actions)> = betxpr_Actions[ActionName];
export function betxpr_actionParams<ActionName extends keyof (betxpr_Actions)>(actionPrams: betxpr_Actions[ActionName]):(object|number|string |number[]|string[])[]{return Object.values(actionPrams)}
