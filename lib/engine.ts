import Decimal from 'decimal.js';
import { attestations, FAQ_URL, HISTORICAL_XAI_MINT, lifecycleFor } from '@/data/lifecycle';
import { canonicalize, diff, hash } from './canonical';
import { CATALOGUE_URL, fetchMint, fetchQuote, parseCatalogue, request } from './sources';
import { evaluate, selectState } from './checks';
import type { Catalogue, Json, Snapshot, SymbolName } from './types';
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
 const checks=evaluate(s,null).map(c=>({id:c.id,status:
  c.id==='mintAuthority' || c.id==='configuration' ? (!m?'NO DATA':c.id==='configuration'&&!m.initialized?'ATTENTION':'VERIFIED') : c.status}));
 return JSON.parse(canonicalize({schemaVersion:2,symbol:s.symbol,
  mint:m?{address:m.address,owner:m.owner,program:m.program,initialized:m.initialized,decimals:m.decimals}:null,
  mintAuthority:m?.mintAuthority??null,freezeAuthority:m?.freezeAuthority??null,
  freezePresent:m?m.freezeAuthority!==null:null,configurationHash:m?.configurationHash??null,
  catalogueStatus:s.catalogueStatus,catalogueMint:s.catalogue?.contract_address??null,
  mintObservable:s.mintObservable,mintSource:s.mintSource,lifecycle,checks,
  routeExists:s.quote?.routeExists??'NO DATA',attestationPresent:s.attestation!==null}));
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
 s.state=selectState(s.lifecycle,s.checks,s.changed);
 return s;
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
