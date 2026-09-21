import type { Check, Snapshot, State, Json } from './types';
import { CATALOGUE_URL } from './sources';
export function evaluate(snapshot: Pick<Snapshot,'symbol'|'catalogueStatus'|'mintObservable'|'catalogue'|'mint'|'quote'|'premium'|'lifecycle'|'mintSource'|'scannedAt'|'firstSeen'>, previous: Snapshot|null): Check[] {
 const s=snapshot, m=s.mint, p=previous?.mint;
 const source=m ? `https://explorer.solana.com/address/${m.address}` : CATALOGUE_URL;
 const first=(id:string)=>previous?.checks.find(c=>c.id===id)?.firstSeen ?? s.scannedAt;
 function check(id:string,label:string,bucket:Check['bucket'],expected:Json,current:Json,status:string,attention:boolean,sourceUrl:string):Check {return {id,label,bucket,expected,current,status,attention,firstSeen:first(id),sourceUrl};}
 const metadataMint=m?.metadata?.mint;
 const match=!!m && !!s.catalogue?.contract_address && s.catalogue.contract_address===m.address && (!metadataMint || metadataMint===m.address);
 const mintStatus=s.catalogueStatus==='ABSENT' ? 'NOT_IN_CATALOGUE' : !m || !s.catalogue?.contract_address ? 'NO DATA' : match?'MATCH':'MISMATCH';
 const authorityStatus=!m?'NO DATA':!p?'FIRST_SEEN':p.mintAuthority===m.mintAuthority?'UNCHANGED':'CHANGED';
 const configStatus=!m?'NO DATA':!p?'FIRST_SEEN':p.configurationHash===m.configurationHash?'UNCHANGED':'CHANGED';
 const mark=s.catalogue?.markPrice;
 const impact=s.quote?.priceImpactPct===null || s.quote?.priceImpactPct===undefined ? null:Number(s.quote.priceImpactPct);
 const quoteStatus=!s.quote || s.quote.routeExists==='NO DATA' || impact===null && s.quote.routeExists!=='NO' ? 'NO DATA':s.quote.routeExists==='NO'?'NO_JUPITER_ROUTE':impact!==null && impact>0.03?'THIN_ON_OBSERVED_ROUTE':'OBSERVED';
 return [
 {...check('mint','Issuer mint match','ONCHAIN VERIFIED',s.catalogueStatus==='ABSENT'?'NOT_IN_CATALOGUE':s.catalogue?.contract_address??null,m?.address??null,mintStatus,mintStatus!=='MATCH',source),...(s.catalogueStatus==='ABSENT'?{description:s.mintObservable==='YES'?'Not in live PreStocks API. Mint still observed on Solana.':'Not in live PreStocks API. See the current Solana mint observation.'}:{})},
 check('supply','Supply & decimals','ONCHAIN VERIFIED',p?{raw:p.rawSupply,decimals:p.decimals,baseUI:p.uiSupply,scaledUI:p.scaledUiSupply}:null,m?{raw:m.rawSupply,decimals:m.decimals,baseUI:m.uiSupply,scaledUI:m.scaledUiSupply}:null,m?'VERIFIED':'NO DATA',!m,source),
 check('mintAuthority','Mint authority','ONCHAIN VERIFIED',p?p.mintAuthority:'NO PREVIOUS SNAPSHOT',m?m.mintAuthority:'NO DATA',authorityStatus,!m || authorityStatus==='CHANGED',source),
 check('freezeAuthority','Freeze authority','ONCHAIN VERIFIED',p?p.freezeAuthority:'NO PREVIOUS SNAPSHOT',m?m.freezeAuthority:'NO DATA',!m?'NO DATA':m.freezeAuthority?'ATTENTION':'VERIFIED',!m || !!m.freezeAuthority,source),
 check('configuration','Token configuration','ONCHAIN VERIFIED',p?.configurationHash??null,m?.configurationHash??null,configStatus,!m || configStatus==='CHANGED' || !m.initialized,source),
 check('mark','Issuer reference mark','ISSUER ATTESTED','Positive reference mark',mark??null,mark!==null && mark!==undefined && mark>0?'ATTESTED':'ATTENTION',!(mark!==null && mark!==undefined && mark>0),CATALOGUE_URL),
 check('lifecycle','Lifecycle disclosure','ISSUER ATTESTED',previous?.lifecycle.state??null,s.lifecycle.state,s.lifecycle.state,s.lifecycle.state!=='NONE_ON_FILE',s.lifecycle.sourceUrl),
 check('premium','Mark / token premium','MARKET OBSERVED','Absolute premium ≤ 15%',s.premium,s.premium===null?'NO DATA':Math.abs(s.premium)>0.15?'ATTENTION':'OBSERVED',s.premium===null || Math.abs(s.premium)>0.15,CATALOGUE_URL),
 check('jupiter','Jupiter · $500 USDC','MARKET OBSERVED','Route present · impact ≤ 3%',s.quote?{route:s.quote.routeExists,outAmount:s.quote.outAmount,priceImpactPct:s.quote.priceImpactPct}:null,quoteStatus,quoteStatus!=='OBSERVED',s.quote?.sourceUrl??'https://lite-api.jup.ag/swap/v1/quote'),
 ];
}
export function selectState(lifecycle:Snapshot['lifecycle'], checks:Check[]):State {
 if(lifecycle.state==='WINDOW_CLOSED') return 'CRITICAL';
 if(lifecycle.state==='ACTION') return 'ACTION';
 if(checks.some(c=>c.attention)) return 'ATTENTION';
 return 'CLEAR';
}
