import { after } from 'next/server';
import { Dashboard } from '@/components/dashboard';
import { scanAll } from '@/lib/service';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export default async function Home(){
 const initialData=await scanAll({preferStored:true});
 after(async()=>{try{await scanAll();}catch{console.error('Background scan unavailable; saved snapshots retained.');}});
 return <Dashboard initialData={initialData}/>;
}
