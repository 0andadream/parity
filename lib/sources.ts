import JSONbig from 'json-bigint';
import Decimal from 'decimal.js';
import { hash } from './canonical';
import type { Catalogue, Extension, Json, Mint, Quote } from './types';
export const CATALOGUE_URL = 'https://prestocks.com/api/prestocks';
export const PUBLIC_RPC = 'https://api.mainnet-beta.solana.com';
export const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const parser = JSONbig({storeAsString:true, protoAction:'ignore', constructorAction:'ignore'});
export async function request(url: string, options?: RequestInit): Promise<{ok:boolean;status:number;data:unknown}> {
 const response = await fetch(url, {...options, cache:'no-store', signal:AbortSignal.timeout(15000)});
 const body = await response.text();
 let data: unknown;
 try { data = parser.parse(body); } catch { data = {error:'Non-JSON response', body:body.slice(0,500)}; }
 return {ok:response.ok,status:response.status,data};
}
const numeric = (v:unknown):number|null => (typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v))) && Number.isFinite(Number(v)) ? Number(v) : null;
Decimal.set({precision:50});
export function parseCatalogue(data: unknown): Catalogue[] {
 if (!Array.isArray(data)) throw new Error('Catalogue response was not an array');
 return data.filter(v => v && typeof v === 'object' && typeof v.symbol === 'string').map(v => ({symbol:v.symbol, name:typeof v.name === 'string' ? v.name : null, contract_address:typeof v.contract_address === 'string' ? v.contract_address : null, markPrice:numeric(v.markPrice), tokenPrice:numeric(v.tokenPrice), markValuation:numeric(v.markValuation), impliedValuation:numeric(v.impliedValuation), supply:numeric(v.supply), markUpdatedAt: typeof v.markUpdatedAt === 'string' ? v.markUpdatedAt : null, statusFields:Object.fromEntries(Object.entries(v).filter(([key])=> /status|lifecycle|deadline|expir/i.test(key))) as Record<string,Json>}));
}
export function parseMint(address:string, data:unknown, now=Date.now()): {mint:Mint|null;slot:number|null;observable:'YES'|'NO'} {
 const r = data as {error?:{message?:string};result?:{context?:{slot:number};value: {owner:string; data:{parsed?:{type:string;info:{decimals:number;isInitialized:boolean;mintAuthority:string|null;freezeAuthority:string|null;supply:string;extensions?:Extension[]}}}}|null}};
 if (r.error || !r.result) throw new Error(r.error?.message || 'Invalid RPC response');
 if (!r.result.value) return {mint:null,slot:r.result.context?.slot ?? null,observable:'NO'};
 const account=r.result.value, parsed=account.data.parsed;
 if (![TOKEN,TOKEN_2022].includes(account.owner) || parsed?.type !== 'mint') throw new Error('Account is not a supported SPL mint');
 const i=parsed.info;
 if (![i.mintAuthority,i.freezeAuthority].every(a=>a===null || typeof a==='string')) throw new Error('Missing mint authority fields');
 if (!/^\d+$/.test(i.supply) || !Number.isInteger(i.decimals) || i.decimals < 0 || i.decimals > 255 || typeof i.isInitialized !== 'boolean') throw new Error('Malformed mint state');
 const extensions=[...(i.extensions || [])].sort((a,b)=>a.extension.localeCompare(b.extension));
 const metadata=extensions.find(x=>x.extension==='tokenMetadata')?.state ?? null;
 const scaled=extensions.find(x=>x.extension==='scaledUiAmountConfig')?.state ?? null;
 const uiSupply=new Decimal(i.supply).div(new Decimal(10).pow(i.decimals)).toFixed();
 const multiplier=scaled ? (Number(scaled.newMultiplierEffectiveTimestamp)*1000 <= now ? scaled.newMultiplier : scaled.multiplier) : null;
 const scaledUiSupply=multiplier !== null && multiplier !== undefined ? new Decimal(uiSupply).mul(String(multiplier)).toFixed() : null;
 // Accrued fee balances are real supply activity, not configuration changes.
 const configExtensions=extensions.map(e=>({...e,state:e.state ? Object.fromEntries(Object.entries(e.state).filter(([k])=>k!=='withheldAmount')) : undefined}));
 return {observable:'YES',slot:r.result.context?.slot ?? null,mint:{address,owner:account.owner,program:account.owner===TOKEN?'Token':'Token-2022',initialized:i.isInitialized,mintAuthority:i.mintAuthority,freezeAuthority:i.freezeAuthority,rawSupply:i.supply,decimals:i.decimals,uiSupply,scaledUiSupply,scaledUiConfig:scaled,extensions,metadata,configurationHash:hash({owner:account.owner,initialized:i.isInitialized,decimals:i.decimals,mintAuthority:i.mintAuthority,freezeAuthority:i.freezeAuthority,extensions:configExtensions,metadata})}};
}
export async function fetchMint(address:string) {
 if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) throw new Error('Invalid issuer mint address');
 const response=await request(process.env.RPC_URL || PUBLIC_RPC,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getAccountInfo',params:[address,{encoding:'jsonParsed',commitment:'finalized'}]})});
 if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
 return parseMint(address,response.data);
}
export function quoteUrl(mint:string) { const q=new URLSearchParams({inputMint:USDC,outputMint:mint,amount:'500000000',slippageBps:'50'}); return 'https://lite-api.jup.ag/swap/v1/quote?'+q; }
export function parseQuote(mint:string, response:{ok:boolean;status:number;data:unknown}): Quote {
 const d=response.data as Record<string,Json>;
 const valid=response.ok && d.inputMint===USDC && d.outputMint===mint && d.inAmount==='500000000' && typeof d.outAmount==='string' && /^\d+$/.test(d.outAmount) && BigInt(d.outAmount)>0n && Array.isArray(d.routePlan) && d.routePlan.length>0;
 const noRoute=['COULD_NOT_FIND_ANY_ROUTE','NO_ROUTES_FOUND','TOKEN_NOT_TRADABLE','COULD_NOT_FIND_ANY_ROUTE_WITH_REQUIRED_LIQUIDITY'].includes(String(d.errorCode));
 const impact=typeof d.priceImpactPct==='string' && Number.isFinite(Number(d.priceImpactPct)) ? d.priceImpactPct : null;
 return {routeExists:valid?'YES':noRoute?'NO':'NO DATA',inputMint:USDC,inputAmount:'500000000',outputMint:mint,outAmount:valid?String(d.outAmount):null,priceImpactPct:valid?impact:null,routePlan:valid?d.routePlan as Json[]:[],error:valid?null:{httpStatus:response.status,body:d},sourceUrl:quoteUrl(mint),contextSlot:typeof d.contextSlot==='number'?d.contextSlot:null};
}
export async function fetchQuote(mint:string) { return parseQuote(mint,await request(quoteUrl(mint))); }
