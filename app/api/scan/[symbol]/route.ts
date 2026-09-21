import { scan } from '@/lib/service';
import { isSymbol } from '@/lib/types';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(_request:Request,{params}:{params:Promise<{symbol:string}>}){
 const symbol=(await params).symbol.toUpperCase();
 if(!isSymbol(symbol))return Response.json({error:'Unknown PreStock'},{status:404});
 try{return Response.json(await scan(symbol),{headers:{'Cache-Control':'no-store'}});}
 catch(error){return Response.json({error:error instanceof Error?error.message:'Scan unavailable. NO DATA.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
