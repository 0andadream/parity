import Decimal from 'decimal.js';
import { attestations, FAQ_URL, HISTORICAL_XAI_MINT, lifecycleFor } from '@/data/lifecycle';
import { canonicalize, diff, hash, stableRoute } from './canonical';
import { CATALOGUE_URL, fetchMint, fetchQuote, parseCatalogue, request } from './sources';
import { evaluate, selectState } from './checks';
import type { Catalogue, Json, Snapshot, SymbolName } from './types';
export interface CatalogueResult { assets:Catalogue[]|null; pulledAt:string; error:string|null }
export async function loadCatalogue():Promise<CatalogueResult> {
 try {const r=await request(CATALOGUE_URL); if(!r.ok)throw new Error(`Catalogue HTTP ${r.status}`); return {assets:parseCatalogue(r.data),pulledAt:new Date().toISOString(),error:null};}
 catch {return {assets:null,pulledAt:new Date().toISOString(),error:'Catalogue could not be retrieved or parsed. NO DATA.'};}
}
export function stateBearing(s:Snapshot):Json {
 const {daysRemaining: _days,...life}=s.lifecycle;
 const {contextSlot:_slot,...quote}=s.quote??{contextSlot:null};
 // Observation times, countdown ticks, RPC slots, derived checks and error messages
 // are excluded. Availability, actual prices, quantities and source terms are included.
 return JSON.parse(canonicalize({schemaVersion:s.schemaVersion,symbol:s.symbol,catalogue:s.catalogue,catalogueStatus:s.catalogueStatus,mint:s.mint,mintObservable:s.mintObservable,mintSource:s.mintSource,lifecycle:life,attestation:s.attestation,premium:s.premium,quote:s.quote?{...quote,error:s.quote.routeExists==='NO'?s.quote.error:null,routePlan:stableRoute(s.quote.routePlan)}:null,evidenceUrls:s.evidenceUrls}));
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
 s.canonical=stateBearing(s);s.currentHash=hash(s.canonical);s.changed=!!previous && previous.currentHash!==s.currentHash;s.changedFields=previous?diff(previous.canonical,s.canonical):[];
 s.checks=evaluate(s,previous);s.state=selectState(s.lifecycle,s.checks,s.changed);
 return s;
}
