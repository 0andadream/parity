import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import JSONbig from 'json-bigint';
import {canonicalize,diff,hash,stableRoute} from '../lib/canonical';
import {parseCatalogue,parseMint,parseQuote,USDC} from '../lib/sources';
import {lifecycleFor} from '../data/lifecycle';
import {evaluate,selectState} from '../lib/checks';
import {stateBearing,finalizeSnapshot,normalizeHistory,classify} from '../lib/engine';
import type {Json,Snapshot} from '../lib/types';
const rpc=JSONbig({storeAsString:true}).parse(readFileSync('data/day0/OPENAI-rpc.json','utf8'));
const mintAddress='PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF';
const mint=parseMint(mintAddress,rpc,Date.parse('2026-09-21')).mint!;
const catalogue=parseCatalogue(JSONbig({storeAsString:true}).parse(readFileSync('data/day0/catalogue.json','utf8'))).find(x=>x.symbol==='OPENAI')!;
function sample(premium:number|null=.15):Snapshot{return {schemaVersion:1,symbol:'OPENAI',scannedAt:'2026-09-21T00:00:00Z',firstSeen:'2026-09-21T00:00:00Z',catalogue,catalogueStatus:'PRESENT',mint,mintObservable:'YES',mintSource:'CATALOGUE',quote:parseQuote(mintAddress,{ok:true,status:200,data:JSON.parse(readFileSync('data/day0/OPENAI-jupiter.json','utf8'))}),premium,lifecycle:lifecycleFor('OPENAI'),attestation:null,checks:[],state:'ATTENTION',currentHash:'',previousHash:null,changed:false,changedFields:[],canonical:null,observations:{cataloguePulledAt:'one',rpcPulledAt:'one',rpcSlot:1,quotePulledAt:'one',commitment:'finalized'},errors:[],evidenceUrls:[]};}
test('canonical hash ignores object insertion ordering; nested diff preserves field paths',()=>{assert.equal(hash({b:1,a:{z:3,y:2}}),hash({a:{y:2,z:3},b:1}));assert.deepEqual(diff({mint:{authority:'A'}},{mint:{authority:'B'}}),[{field:'mint.authority',previous:'A',current:'B'}]);assert.notEqual(hash(['a','b']),hash(['b','a']));});
test('lossless parsing preserves large fees and numeric catalogue decimals',()=>{assert.ok(catalogue.markPrice!>0);const fee=mint.extensions.find(e=>e.extension==='transferFeeConfig')!.state!;assert.equal((fee.newerTransferFee as Record<string,Json>).maximumFee,'18446744073709551615');assert.equal(mint.rawSupply,'1901869963771');assert.equal(mint.uiSupply,'1901.869963771');assert.equal(mint.scaledUiSupply,'2826.4349480478259537');});
test('scheduled multiplier uses the previous value before activation',()=>{const before=parseMint(mintAddress,rpc,1).mint!;assert.equal(before.scaledUiSupply,before.uiSupply);});
test('an unrelated account is not treated as a verified mint',()=>{const bad=structuredClone(rpc);bad.result.value.owner='11111111111111111111111111111111';assert.throws(()=>parseMint(mintAddress,bad));assert.deepEqual(parseMint(mintAddress,{result:{context:{slot:1},value:null}}),{mint:null,slot:1,observable:'NO'});});
test('lifecycle transitions at the exact deadline and never early-critical',()=>{const at=Date.parse('2027-03-12T23:59:00Z');assert.equal(lifecycleFor('SPACEX',at-1).state,'ACTION');assert.equal(lifecycleFor('SPACEX',at).state,'WINDOW_CLOSED');assert.equal(selectState(lifecycleFor('SPACEX',at-1),[]),'ACTION');assert.equal(selectState(lifecycleFor('XAI',at),[]),'CRITICAL');});
test('premium threshold is absolute and strictly greater than 15%; unknowns get attention',()=>{for(const v of [.15,-.15])assert.equal(evaluate(sample(v),null).find(c=>c.id==='premium')!.attention,false);for(const v of [.150001,-.150001,null])assert.equal(evaluate(sample(v),null).find(c=>c.id==='premium')!.attention,true);});
test('Jupiter impact threshold uses a fraction and is strictly greater than 3%',()=>{const s=sample();s.quote!.priceImpactPct='.03';assert.equal(evaluate(s,null).find(c=>c.id==='jupiter')!.status,'OBSERVED');s.quote!.priceImpactPct='.030001';assert.equal(evaluate(s,null).find(c=>c.id==='jupiter')!.status,'THIN_ON_OBSERVED_ROUTE');});
test('a source failure is not equivalent to no DEX route',()=>{assert.equal(parseQuote(mintAddress,{ok:false,status:429,data:{error:'Rate limit'}}).routeExists,'NO DATA');assert.equal(parseQuote(mintAddress,{ok:false,status:400,data:{errorCode:'COULD_NOT_FIND_ANY_ROUTE'}}).routeExists,'NO');const d={inputMint:USDC,outputMint:mintAddress,inAmount:'1',outAmount:'100',routePlan:[{}]};assert.equal(parseQuote(mintAddress,{ok:true,status:200,data:d}).routeExists,'NO DATA');});
test('freeze authority is attention; revoked authority is a known null, not missing',()=>{const s=sample();assert.equal(evaluate(s,null).find(c=>c.id==='freezeAuthority')!.status,'ATTENTION');const next=structuredClone(s);next.mint!.mintAuthority=null;next.mint!.freezeAuthority=null;const checks=evaluate(next,s);assert.equal(checks.find(c=>c.id==='mintAuthority')!.status,'CHANGED');assert.equal(checks.find(c=>c.id==='freezeAuthority')!.status,'VERIFIED');});
test('historical XAI address cannot manufacture a catalogue match',()=>{const s=sample();s.catalogue=null;s.catalogueStatus='ABSENT';s.mintSource='HISTORICAL_ISSUER_PAGE';const check=evaluate(s,null)[0];assert.equal(check.status,'NOT_IN_CATALOGUE');assert.equal(check.attention,true);assert.equal(check.expected,'NOT_IN_CATALOGUE');assert.equal(check.description,'Not in live PreStocks API. Mint still observed on Solana.');s.catalogueStatus='NO DATA';assert.equal(evaluate(s,null)[0].status,'NO DATA');});
test('prices, quote amounts, supply activity and clocks stay outside the state hash',()=>{
 const a=finalizeSnapshot(sample(.1),null),b=structuredClone(a);
 b.scannedAt='2026-09-21T00:01:00Z';b.observations.rpcSlot=9;b.observations.quotePulledAt='two';
 b.quote!.contextSlot=999;b.lifecycle.daysRemaining=400;b.quote!.outAmount='123';b.quote!.priceImpactPct='.02';
 b.catalogue!.markPrice=1000;b.catalogue!.tokenPrice=1110;b.catalogue!.markUpdatedAt='two';b.catalogue!.supply=999;
 b.premium=.11;b.mint!.rawSupply='999';b.mint!.uiSupply='0.000000999';b.mint!.scaledUiSupply='0.000001';
 for(const item of b.quote!.routePlan){((item as Record<string,Json>).swapInfo as Record<string,Json>).updateContextSlot='999';}
 const next=finalizeSnapshot(b,a);
 assert.equal(next.currentHash,a.currentHash);assert.equal(next.previousHash,a.currentHash);
 assert.equal(next.changed,false);assert.deepEqual(next.changedFields,[]);assert.notEqual(next.state,'CHANGED');
 assert.equal(next.observedNow!.outAmount,'123');assert.equal(next.observedNow!.tokenPrice,1110);
 assert.deepEqual(next.canonical,next.hashedState);
});
test('premium and impact threshold crossings stay in observedNow and do not flip CHANGED',()=>{
 const a=finalizeSnapshot(sample(.1),null),b=structuredClone(a);b.premium=.2;b.quote!.priceImpactPct='.04';
 const next=finalizeSnapshot(b,a);assert.equal(next.changed,false);assert.deepEqual(next.changedFields,[]);
 assert.equal(next.checks.find(c=>c.id==='premium')!.status,'ATTENTION');
 assert.equal(next.checks.find(c=>c.id==='jupiter')!.status,'THIN_ON_OBSERVED_ROUTE');
 assert.equal(next.observedNow!.premium,.2);
 assert.equal(next.historyKind,'CONDITION');
 assert.ok(next.historyEvents!.some(e=>e.kind==='CONDITION'&&e.field==='premiumBand'));
 assert.ok(next.historyEvents!.some(e=>e.kind==='CONDITION'&&e.field==='jupiterImpact'));
});
test('first snapshot is BASELINE; authority change is STATE CHANGE; price ticks are not events',()=>{
 const first=finalizeSnapshot(sample(.1),null);
 assert.equal(first.historyKind,'BASELINE');
 const same=finalizeSnapshot(structuredClone(first),first);
 assert.equal(same.historyKind,'UNCHANGED');
 const moved=structuredClone(same);moved.premium=.11;moved.quote!.outAmount='999';
 assert.equal(finalizeSnapshot(moved,same).historyKind,'UNCHANGED');
 const auth=structuredClone(same);auth.mint!.mintAuthority='new-authority';
 const next=finalizeSnapshot(auth,same);
 assert.equal(next.historyKind,'STATE_CHANGE');
 assert.ok(next.historyEvents!.some(e=>e.kind==='STATE_CHANGE'&&e.field==='mintAuthority'));
 assert.equal(classify(first,null).historyKind,'BASELINE');
});
test('authority changes are recorded once; comparison labels do not cause another change',()=>{
 const first=finalizeSnapshot(sample(.1),null),same=finalizeSnapshot(structuredClone(first),first);
 assert.equal(same.changed,false);
 const changed=structuredClone(same);changed.mint!.mintAuthority='new-authority';
 const next=finalizeSnapshot(changed,same);assert.equal(next.changed,true);
 assert.ok(next.changedFields.some(d=>d.field==='mintAuthority'));
 const after=finalizeSnapshot(structuredClone(next),next);assert.equal(after.changed,false);assert.deepEqual(after.changedFields,[]);
});
test('stable integrity fields and lifecycle changes remain detectable',()=>{
 const a=finalizeSnapshot(sample(.1),null);
 for(const mutate of [
  (b:Snapshot)=>{b.mint!.configurationHash='new-config';},
  (b:Snapshot)=>{b.mint!.freezeAuthority=null;},
  (b:Snapshot)=>{b.catalogue=null;b.catalogueStatus='ABSENT';},
  (b:Snapshot)=>{b.mintObservable='NO';b.mint=null;},
  (b:Snapshot)=>{b.lifecycle.state='WINDOW_CLOSED';},
  (b:Snapshot)=>{b.attestation={provider:'Provider',reviewer:'Reviewer',reportDate:'2026-09-21',mintableSupply:'1',mintedSupply:'1',sourceUrl:'https://example.com/report',scope:'Test'};},
 ]){const b=structuredClone(a);mutate(b);assert.equal(finalizeSnapshot(b,a).changed,true);}
});
test('legacy history is rebased without market noise or a deployment-only change',()=>{
 const first=sample(.1);first.currentHash=hash({oldPrice:100});first.canonical={oldPrice:100};
 const second=structuredClone(first);second.catalogue!.tokenPrice=123;second.quote!.outAmount='456';
 second.scannedAt='2026-09-21T00:01:00Z';second.currentHash=hash({oldPrice:123});second.canonical={oldPrice:123};second.changed=true;
 const history=normalizeHistory([second,first]);
 assert.equal(history[0].changed,false);assert.deepEqual(history[0].changedFields,[]);
 assert.equal(history[0].previousHash,history[1].currentHash);
 assert.equal(finalizeSnapshot(structuredClone(second),history[0]).changed,false);
 assert.deepEqual(normalizeHistory(history),history);
});
test('withheld fee activity changes snapshot state but not configuration fingerprint',()=>{const b=structuredClone(rpc);b.result.value.data.parsed.info.extensions.find((e:{extension:string})=>e.extension==='transferFeeConfig').state.withheldAmount+=1;const next=parseMint(mintAddress,b).mint!;assert.equal(mint.configurationHash,next.configurationHash);assert.notEqual(hash(mint),hash(next));});
