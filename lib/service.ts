import { collect, loadCatalogue, type CatalogueResult } from './engine';
import { readHistory, saveSnapshot, persistenceMode } from './store';
import { SYMBOLS, type SymbolName, type Detail, type Snapshot, type Summary } from './types';
import { hash } from './canonical';
const inFlight=new Map<SymbolName,Promise<Detail>>();
const MIN_INTERVAL=30_000;
function detail(snapshot:Snapshot,history:Snapshot[], persistence=persistenceMode()):Detail {
 return {...snapshot,age:Math.max(0,Math.floor((Date.now()-Date.parse(snapshot.scannedAt))/1000)),persistence,history:history.map(({scannedAt,currentHash,previousHash,state,changed,changedFields})=>({scannedAt,currentHash,previousHash,state,changed,changedFields}))};
}
export async function scan(symbol:SymbolName, catalogue?:Promise<CatalogueResult>):Promise<Detail> {
 const pending=inFlight.get(symbol);if(pending)return pending;
 const promise=(async()=>{
  let stored:Awaited<ReturnType<typeof readHistory>>;
  try{stored=await readHistory(symbol);}catch{throw new Error('Snapshot history unavailable. Scan paused to preserve comparison continuity.');}
  const last=stored.snapshots[0]??null;
  const crossed=last?.lifecycle.deadline && Date.parse(last.lifecycle.deadline)<=Date.now() && last.lifecycle.state==='ACTION';
  if(last && Date.now()-Date.parse(last.scannedAt)<MIN_INTERVAL && !crossed)return detail(last,stored.snapshots);
  const next=await collect(symbol,last,await(catalogue??loadCatalogue()));
  try{
   const saved=await saveSnapshot(next,stored);
   return detail(next,saved?[next,...stored.snapshots].slice(0,100):[next]);
  }catch{
   // Another instance can win the conditional write. Return that committed chain.
   const winner=await readHistory(symbol);
   if(winner.snapshots[0] && winner.snapshots[0].scannedAt!==last?.scannedAt)return detail(winner.snapshots[0],winner.snapshots);
   throw new Error('Snapshot could not be saved. No history was overwritten.');
  }
 })();
 inFlight.set(symbol,promise);
 try{return await promise;}finally{inFlight.delete(symbol);}
}
export async function scanAll():Promise<Summary> {
 const catalogue=loadCatalogue();
 const results=await Promise.all(SYMBOLS.map(symbol=>scan(symbol,catalogue)));
 return {scannedAt:new Date(Math.max(...results.map(s=>Date.parse(s.scannedAt)))).toISOString(),hash:hash(results.map(s=>({symbol:s.symbol,hash:s.currentHash}))),persistence:persistenceMode(),assets:results.map(s=>({symbol:s.symbol,state:s.state,checks:s.checks,lifecycle:s.lifecycle,currentHash:s.currentHash,previousHash:s.previousHash,changed:s.changed,age:s.age,scannedAt:s.scannedAt,mintObservable:s.mintObservable}))};
}
