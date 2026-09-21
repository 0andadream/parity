'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Json, Lifecycle } from '@/lib/types';
export function Mark(){return <span className="brand-mark" aria-hidden="true"><i/><i/><i/></span>;}
export function AssetEmblem({symbol,size=34}:{symbol:string;size?:number}){
 return <span className={`asset-emblem ${symbol.toLowerCase()}`} style={{width:size,height:size}}><img src={`/logos/${symbol.toLowerCase()}.png`} alt="" width={size} height={size}/></span>;
}
export function Header(){return <header className="header"><Link href="/" className="brand" aria-label="Parity home"><Mark/><strong>PARITY</strong></Link><div className="header-right"><span className="network">SOLANA MAINNET</span><span className="edition">INTEGRITY MONITOR / 01</span></div></header>;}
export function Footer(){return <footer><span>PARITY <b>KNOW WHAT’S VERIFIED.</b></span><span>Onchain token state ≠ underlying SPV holdings.</span></footer>;}
export function Badge({value}:{value:string}){return <span className={`badge ${value.toLowerCase().replaceAll('_','-').replaceAll(' ','-')}`}>{value.replaceAll('_',' ')}</span>;}
export function Source({url,children='SOURCE'}:{url:string;children?:React.ReactNode}){return <a className="source" href={(/^https:\/\//.test(url)||url.startsWith('/api/'))?url:undefined} target="_blank" rel="noopener noreferrer">{children} <span aria-hidden="true">↗</span></a>;}
export const shortHash=(value:string|null)=>value?value.slice(0,6)+'…'+value.slice(-4):',';
export function useClock(){const [now,setNow]=useState<number|null>(null);useEffect(()=>{setNow(Date.now());const i=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(i);},[]);return now;}
export function Age({at,initialAge=0}:{at:string;initialAge?:number}){const now=useClock();const seconds=now===null?initialAge:Math.max(0,Math.floor((now-Date.parse(at))/1000));return <span title={at}>{seconds<60?`${seconds}s`:seconds<3600?`${Math.floor(seconds/60)}m ${seconds%60}s`:`${Math.floor(seconds/3600)}h ${Math.floor(seconds%3600/60)}m`}</span>;}
export function Countdown({deadline,compact=false,at}:{deadline:string;compact?:boolean;at?:string}){
 const clock=useClock();const now=clock??(at?Date.parse(at):null);if(now===null)return <span>CALCULATING…</span>;
 const left=Math.max(0,Date.parse(deadline)-now);if(left===0)return <span>WINDOW CLOSED</span>;
 const days=Math.floor(left/86400000),hours=Math.floor(left/3600000)%24,minutes=Math.floor(left/60000)%60,seconds=Math.floor(left/1000)%60;
 return <span title={`${(left/86400000).toFixed(6)} days remaining`}>{compact?`${days}D ${String(hours).padStart(2,'0')}H`:<>{days}<small> DAYS </small>{String(hours).padStart(2,'0')}<small>:</small>{String(minutes).padStart(2,'0')}<small>:</small>{String(seconds).padStart(2,'0')}</>}</span>;
}
export function LifeState({life,at}:{life:Lifecycle;at?:string}){return life.deadline?<Countdown deadline={life.deadline} compact at={at}/>:<span className="muted">NONE ON FILE</span>;}
export function Value({value}:{value:Json|undefined}){if(value===null || value===undefined)return <span className="no-data">NO DATA</span>;if(typeof value==='object')return <pre className="json-value">{JSON.stringify(value,null,2)}</pre>;return <span className="break-anywhere">{String(value)}</span>;}
export function money(value:number|null|undefined){return value===null || value===undefined?'NO DATA':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);}
export function amount(value:number|null|undefined){return value===null || value===undefined?'NO DATA':new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(value);}
export function date(value:string){return new Date(value).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC';}
export function ScanButton({loading,onClick}:{loading:boolean;onClick:()=>void}){return <button className="scan-button" onClick={onClick} disabled={loading}><span className={loading?'spin':''} aria-hidden="true">⟳</span>{loading?'SCANNING':'SCAN NOW'}</button>;}
