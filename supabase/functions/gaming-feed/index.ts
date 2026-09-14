import {excludedExternalContent} from '../_shared/content-policy.mjs';
import {XMLParser} from 'npm:fast-xml-parser@5.11.1';
import {parseFeed,mergeArticles} from './feed-data.mjs';
const sources=[{name:'GameSpot',host:'gamespot.com',news:'https://www.gamespot.com/feeds/news/',reviews:'https://www.gamespot.com/feeds/reviews/'},{name:'PC Gamer',host:'pcgamer.com',news:'https://www.pcgamer.com/rss/',reviews:'https://www.pcgamer.com/rss/'}];
const cache=new Map<string,{expires:number,payload:unknown}>();
const pending=new Map<string,Promise<unknown>>();
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'GET, OPTIONS'};
async function fetchArticles(kind:'news'|'reviews'){
 const results=await Promise.allSettled(sources.map(async source=>{
  const response=await fetch(source[kind],{signal:AbortSignal.timeout(10000),headers:{Accept:'application/rss+xml, application/xml, text/xml'}});
  if(!response.ok)throw new Error('Publisher unavailable');
  // Bound upstream payload size even when a server does not provide Content-Length.
  const reader=response.body!.getReader(),chunks:Uint8Array[]=[];let size=0;
  for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>3_000_000){await reader.cancel();throw new Error('Feed too large');}chunks.push(value);}
  const combined=new Uint8Array(size);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.length;}
  return parseFeed(new TextDecoder().decode(combined),source,kind,XMLParser);
 }));
 const successful=results.filter(result=>result.status==='fulfilled') as PromiseFulfilledResult<ReturnType<typeof parseFeed>>[];
 if(!successful.length)throw new Error('Publishers unavailable');
 const payload={items:mergeArticles(successful.map(result=>result.value)).filter(item=>!excludedExternalContent(item)),updatedAt:new Date().toISOString(),partial:successful.length<sources.length,stale:false};
 cache.set(kind,{expires:Date.now()+600000,payload});return payload;
}
Deno.serve(async(request:Request)=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Cache-Control':status===200?'public, max-age=300':'no-store'}});
 if(request.method!=='GET')return respond({error:'Use GET.'},405);
 const kind=new URL(request.url).searchParams.get('kind') || 'news';
 if(kind!=='news' && kind!=='reviews')return respond({error:'Choose news or reviews.'},400);
 const stored=cache.get(kind);if(stored && stored.expires>Date.now())return respond(stored.payload);
 try{
  if(!pending.has(kind))pending.set(kind,fetchArticles(kind).finally(()=>pending.delete(kind)));
  return respond(await pending.get(kind));
 }catch{
  if(stored && stored.expires>Date.now()-86400000)return respond({...stored.payload as object,stale:true});
  return respond({error:'Publishers are temporarily unavailable. Please try again shortly.'},503);
 }
});
