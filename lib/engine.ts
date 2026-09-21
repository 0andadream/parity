import Decimal from 'decimal.js';
import { attestations, FAQ_URL, HISTORICAL_XAI_MINT, lifecycleFor } from '@/data/lifecycle';
import { canonicalize, diff, hash } from './canonical';
import { CATALOGUE_URL, fetchMint, fetchQuote, parseCatalogue, request } from './sources';
import { evaluate, selectState } from './checks';
import type { Catalogue, HistoryEvent, HistoryKind, Json, Snapshot, SymbolName } from './types';
export interface CatalogueResult { assets:Catalogue[]|null; pulledAt:string; error:string|null }
export async function loadCatalogue():Promise<CatalogueResult> {
 try {const r=await request(CATALOGUE_URL); if(!r.ok)throw new Error(`Catalogue HTTP ${r.status}`); return {assets:parseCatalogue(r.data),pulledAt:new Date().toISOString(),error:null};}
 catch {return {assets:null,pulledAt:new Date().toISOString(),error:'Catalogue could not be retrieved or parsed. NO DATA.'};}
}
export function stateBearing(s:Snapshot):Json {
 const m=s.mint;
 const {daysRemaining: _days, verifiedAt: _reviewed, ...lifecycle}=s.lifecycle;
 // Comparison labels (FIRST_SEEN / CHANGED / UNCHANGED) are not durable state.
 // The authority and configuration values themselves record those changes once.
 const hashedIds=new Set(['mint','supply','mintAuthority','freezeAuthority','configuration','lifecycle']);
 const checks=evaluate(s,null).filter(c=>hashedIds.has(c.id)).map(c=>({id:c.id,status:
  c.id==='mintAuthority' || c.id==='configuration' ? (!m?'NO DATA':c.id==='configuration'&&!m.initialized?'ATTENTION':'VERIFIED') : c.status}));
 return JSON.parse(canonicalize({schemaVersion:2,symbol:s.symbol,
  mint:m?{address:m.address,owner:m.owner,program:m.program,initialized:m.initialized,decimals:m.decimals}:null,
  mintAuthority:m?.mintAuthority??null,freezeAuthority:m?.freezeAuthority??null,
  freezePresent:m?m.freezeAuthority!==null:null,configurationHash:m?.configurationHash??null,
  catalogueStatus:s.catalogueStatus,catalogueMint:s.catalogue?.contract_address??null,
  mintObservable:s.mintObservable,mintSource:s.mintSource,lifecycle,checks,
  attestationPresent:s.attestation!==null}));
}
export function finalizeSnapshot(snapshot:Snapshot, previous:Snapshot|null):Snapshot {
 const s={...snapshot,schemaVersion:2 as const};
 s.checks=evaluate(s,previous);
 s.hashedState=stateBearing(s);
 s.canonical=s.hashedState; // Retained API alias; both contain stable state only.
 s.observedNow={markPrice:s.catalogue?.markPrice??null,tokenPrice:s.catalogue?.tokenPrice??null,
  premium:s.premium,outAmount:s.quote?.outAmount??null,priceImpactPct:s.quote?.priceImpactPct??null,scannedAt:s.scannedAt};
 s.currentHash=hash(s.hashedState);
 const previousState=previous?stateBearing(previous):null;
 s.previousHash=previousState?hash(previousState):null;
 s.changed=previousState!==null && s.previousHash!==s.currentHash;
 s.changedFields=previousState?diff(previousState,s.hashedState):[];
 const classified=classify(s,previous);
 s.historyKind=classified.historyKind;
 s.historyEvents=classified.historyEvents;
 s.state=selectState(s.lifecycle,s.checks);
 return s;
}
export function conditionBearing(s:Snapshot):Json {
 const impact=s.quote?.priceImpactPct===null || s.quote?.priceImpactPct===undefined ? null:Number(s.quote.priceImpactPct);
 const mark=s.catalogue?.markPrice;
 return {
  premiumBand:s.premium===null || s.premium===undefined ? 'NO_DATA' : Math.abs(s.premium)>0.15 ? 'OUTSIDE' : 'INSIDE',
  jupiterRoute:s.quote?.routeExists ?? 'NO DATA',
  jupiterImpact:!s.quote || s.quote.routeExists!=='YES' || impact===null ? (s.quote?.routeExists==='NO'?'NO_ROUTE':'NO_DATA') : impact>0.03 ? 'THIN' : 'INSIDE',
  markPresent:mark!==null && mark!==undefined && mark>0,
 };
}
const STATE_LABELS:Record<string,string>={
 mintAuthority:'MINT AUTHORITY',freezeAuthority:'FREEZE AUTHORITY',configurationHash:'TOKEN CONFIGURATION',
 catalogueMint:'CONTRACT ADDRESS',catalogueStatus:'CATALOGUE MEMBERSHIP',mintObservable:'MINT OBSERVABLE',
 mintSource:'MINT SOURCE','lifecycle.state':'LIFECYCLE STATE','lifecycle.ratio':'CONVERSION RATIO',
 'lifecycle.deadline':'CONVERSION DEADLINE','lifecycle.event':'LIFECYCLE EVENT','mint.address':'MINT',
 'mint.program':'OWNER PROGRAM','mint.decimals':'DECIMALS',attestationPresent:'ATTESTATION',
 freezePresent:'FREEZE PRESENT',
};
const CONDITION_LABELS:Record<string,string>={
 premiumBand:'PREMIUM THRESHOLD',jupiterRoute:'JUPITER ROUTE',jupiterImpact:'JUPITER IMPACT',markPresent:'ISSUER MARK',
};
function formatCondition(field:string, snap:Snapshot):string {
 if(field==='premiumBand'){
  const p=snap.premium;
  if(p===null || p===undefined) return 'NO DATA';
  const pct=`${p>=0?'+':''}${(p*100).toFixed(1)}%`;
  return `${pct} · ${Math.abs(p)>0.15?'ATTENTION':'OBSERVED'}`;
 }
 if(field==='jupiterRoute') return snap.quote?.routeExists==='NO'?'NO JUPITER ROUTE':snap.quote?.routeExists??'NO DATA';
 if(field==='jupiterImpact'){
  if(snap.quote?.routeExists==='NO') return 'NO JUPITER ROUTE';
  const raw=snap.quote?.priceImpactPct;
  if(raw===null || raw===undefined) return 'NO DATA';
  const n=Number(raw);
  return `${(n*100).toFixed(2)}% · ${n>0.03?'THIN ON OBSERVED ROUTE':'OBSERVED'}`;
 }
 if(field==='markPresent'){
  const mark=snap.catalogue?.markPrice;
  return mark!==null && mark!==undefined && mark>0?'ATTESTED':'NO DATA';
 }
 return 'NO DATA';
}
export function classify(s:Snapshot, previous:Snapshot|null):{historyKind:HistoryKind|'UNCHANGED';historyEvents:HistoryEvent[]} {
 if(!previous) return {historyKind:'BASELINE',historyEvents:[]};
 const stateDiffs=diff(stateBearing(previous),stateBearing(s));
 const condDiffs=diff(conditionBearing(previous),conditionBearing(s));
 const historyEvents:HistoryEvent[]=[
  ...stateDiffs.map(d=>({kind:'STATE_CHANGE' as const,field:d.field,label:STATE_LABELS[d.field]??d.field.replaceAll('.',' ').toUpperCase(),previous:d.previous,current:d.current})),
  ...condDiffs.map(d=>({kind:'CONDITION' as const,field:d.field,label:CONDITION_LABELS[d.field]??d.field.toUpperCase(),previous:formatCondition(d.field,previous),current:formatCondition(d.field,s)})),
 ];
 return {historyKind:stateDiffs.length?'STATE_CHANGE':condDiffs.length?'CONDITION':'UNCHANGED',historyEvents};
}
// Reproject legacy history through the same hash boundary so deployment itself
// does not manufacture changes or leave market-only diffs in the history UI.
export function normalizeHistory(snapshots:Snapshot[]):Snapshot[] {
 let previous:Snapshot|null=null;
 return [...snapshots].reverse().map(snapshot=>{
  previous=snapshot.schemaVersion===2?snapshot:finalizeSnapshot(snapshot,previous);
  return previous;
 }).reverse();
}
export async function collect(symbol:SymbolName, previous:Snapshot|null, catalog:CatalogueResult):Promise<Snapshot> {
 const catalogue=catalog.assets?.find(a=>a.symbol===symbol)??null;
 const address=catalogue?.contract_address || (symbol==='XAI'?HISTORICAL_XAI_MINT:null);
 const errors:Snapshot['errors']=catalog.error?[{source:'PreStocks API',message:catalog.error}]:[];
 let mint:Snapshot['mint']=null, quote:Snapshot['quote']=null, slot:number|null=null, observable:Snapshot['mintObservable']='NO DATA';
 let rpcPulledAt=new Date().toISOString(),quotePulledAt=rpcPulledAt;
 await Promise.all([
  (async()=>{if(!address)return;try{const r=await fetchMint(address);mint=r.mint;slot=r.slot;observable=r.observable;}catch{errors.push({source:'Solana RPC',message:'Mint account could not be retrieved or validated. NO DATA.'});}finally{rpcPulledAt=new Date().toISOString();}})(),
  (async()=>{if(!address)return;try{quote=await fetchQuote(address);if(quote.routeExists==='NO DATA')errors.push({source:'Jupiter',message:'Quote unavailable; route existence is NO DATA.'});}catch{errors.push({source:'Jupiter',message:'Quote request failed. NO DATA; this is not evidence of no route.'});}finally{quotePulledAt=new Date().toISOString();}})(),
 ]);
 const scannedAt=new Date().toISOString();
 const premium=catalogue?.markPrice && catalogue.markPrice>0 && catalogue.tokenPrice!==null ? new Decimal(catalogue.tokenPrice).minus(catalogue.markPrice).div(catalogue.markPrice).toNumber():null;
 const s:Snapshot={schemaVersion:1,symbol,scannedAt,firstSeen:previous?.firstSeen??scannedAt,catalogue,catalogueStatus:catalog.assets===null?'NO DATA':catalogue?'PRESENT':'ABSENT',mint,mintObservable:observable,mintSource:catalogue?.contract_address?'CATALOGUE':symbol==='XAI'?'HISTORICAL_ISSUER_PAGE':'NO DATA',quote,premium,lifecycle:lifecycleFor(symbol),attestation:attestations[symbol]??null,checks:[],state:'ATTENTION',currentHash:'',previousHash:previous?.currentHash??null,changed:false,changedFields:[],canonical:null,observations:{cataloguePulledAt:catalog.pulledAt,rpcPulledAt,rpcSlot:slot,quotePulledAt,commitment:'finalized'},errors,evidenceUrls:[CATALOGUE_URL,`https://prestocks.com/${symbol.toLowerCase()}`,FAQ_URL,...(address?[`https://explorer.solana.com/address/${address}`]:[]),...(attestations[symbol]?[attestations[symbol]!.sourceUrl]:[])]};
 return finalizeSnapshot(s,previous);
}
