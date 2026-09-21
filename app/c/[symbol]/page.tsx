import {after} from 'next/server';
import {scan} from '@/lib/service';
import {notFound} from 'next/navigation';
import {isSymbol} from '@/lib/types';
import {Detail} from '@/components/detail';
export async function generateMetadata({params}:{params:Promise<{symbol:string}>}){return {title:`${(await params).symbol.toUpperCase()} evidence`};}
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export default async function AssetPage({params}:{params:Promise<{symbol:string}>}){const symbol=(await params).symbol.toUpperCase();if(!isSymbol(symbol))notFound();const initialData=await scan(symbol,undefined,{preferStored:true});after(async()=>{try{await scan(symbol);}catch{console.error('Background scan unavailable; saved snapshot retained.');}});return <Detail key={symbol} symbol={symbol} initialData={initialData}/>;}
