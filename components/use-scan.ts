'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
export function useScan<T>(url:string,initialData:T){
 const [data,setData]=useState<T|null>(initialData),[loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);const active=useRef(false);
 const refresh=useCallback(async()=>{if(active.current)return;active.current=true;setLoading(true);setError(null);try{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(65000)});const body=await r.json();if(!r.ok)throw new Error(body.error||'Scan unavailable');setData(body);}catch(e){setError(e instanceof Error?e.message:'Scan unavailable. NO DATA.');}finally{active.current=false;setLoading(false);}},[url]);
 useEffect(()=>{const interval=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},60000);return()=>clearInterval(interval);},[refresh]);
 return {data,loading,error,refresh};
}
