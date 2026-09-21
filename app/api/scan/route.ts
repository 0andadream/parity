import { scanAll } from '@/lib/service';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(){
 try{return Response.json(await scanAll(),{headers:{'Cache-Control':'no-store'}});}
 catch(error){return Response.json({error:error instanceof Error?error.message:'Scan unavailable. NO DATA.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
