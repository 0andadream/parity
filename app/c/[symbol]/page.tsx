import {notFound} from 'next/navigation';
import {isSymbol} from '@/lib/types';
import {Detail} from '@/components/detail';
export async function generateMetadata({params}:{params:Promise<{symbol:string}>}){return {title:`${(await params).symbol.toUpperCase()} evidence`};}
export default async function AssetPage({params}:{params:Promise<{symbol:string}>}){const symbol=(await params).symbol.toUpperCase();if(!isSymbol(symbol))notFound();return <Detail symbol={symbol}/>;}
