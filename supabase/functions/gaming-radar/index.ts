import {excludedExternalContent} from '../_shared/content-policy.mjs';
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {rawgGames,steamRanks,radarRequest,calendarOrders,calendarPlatforms,POPULAR_MIN} from './radar-data.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const pending=new Map();
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'GET, OPTIONS'};
async function json(url:string){const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('Upstream unavailable');return r.json();}
async function parallel(items:any[],fn:any){const out:any[]=[];let i=0;await Promise.all(Array.from({length:5},async()=>{while(i<items.length){const item=items[i++];try{out.push(await fn(item));}catch{out.push(null);}}}));return out;}
async function collect(selection:any,now:Date){
 const {kind,period,page}=selection;
 if(kind==='trending'){
  const ranks=steamRanks(await json('https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/'));
  const rows=await parallel(ranks,async(r:any)=>{
   const [details,players]=await Promise.all([json(`https://store.steampowered.com/api/appdetails?appids=${r.appid}&l=english&cc=us`),json(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${r.appid}`)]);
   const g=details[r.appid]?.data;if(!g || g.type!=='game'||excludedExternalContent(g))return {excluded:true};
   if(!Number.isFinite(players.response?.player_count))throw new Error('No player count');
   return {id:r.appid,title:g.name,url:`https://store.steampowered.com/app/${r.appid}/`,image:typeof g.header_image==='string' && /^https:\/\/[^/]*steamstatic\.com\//.test(g.header_image)?g.header_image:'',players:players.response.player_count,chartRank:r.rank,platforms:['Steam']};
  });
  const items=rows.filter(g=>g && !g.excluded).sort((a,b)=>b.players-a.players).slice(0,20);if(!items.length)throw new Error('Steam unavailable');
  return {items,partial:rows.some(g=>g===null),source:'Steam',sourceUrl:'https://store.steampowered.com/charts/mostplayed',updatedAt:new Date().toISOString(),stale:false};
 }
 const key=Deno.env.get('RAWG_API_KEY');if(!key)throw new Error('Release data unavailable');
 const {start,end}=period;
 const query=new URLSearchParams({key,ordering:kind==='top250'?'-metacritic':kind==='calendar'?calendarOrders[selection.order]:'-added',page_size:'40'});
 if(kind==='calendar'&&calendarPlatforms[selection.platform])query.set('parent_platforms',calendarPlatforms[selection.platform]);
 if(kind==='top250')query.set('metacritic','1,100');else query.set('dates',start+','+end);
 let data:any;
 if(kind==='top250'){
  const pages=await Promise.all(Array.from({length:7},(_,i)=>{const q=new URLSearchParams(query);q.set('page',String(i+1));return json('https://api.rawg.io/api/games?'+q);}));
  if(pages.some(p=>!Array.isArray(p.results)))throw new Error('Invalid ranking response');
  data={results:pages.flatMap(p=>p.results)};
 }else{query.set('page',String(page));data=await json('https://api.rawg.io/api/games?'+query);}
 let filtered=rawgGames(data,kind,now,period);
 // Fill the ranking after exclusions, preserving the upstream score ordering.
 if(kind==='top250'){for(let page=8;filtered.length<250&&page<=12;page++){query.set('page',String(page));const extra=await json('https://api.rawg.io/api/games?'+query);if(!Array.isArray(extra.results))throw new Error('Invalid ranking response');data.results.push(...extra.results);filtered=rawgGames(data,kind,now,period);if(!extra.next)break;}}
 if(kind==='calendar'&&selection.popular)filtered=filtered.filter(g=>g.interest>=POPULAR_MIN);
 const items=filtered.slice(0,kind==='top250'?250:40);
 return {items,source:'RAWG',sourceUrl:'https://rawg.io/',updatedAt:new Date().toISOString(),stale:false,partial:false,
  ...(kind==='top250'?{ranking:'metacritic'}:{period:{start,end}}),
  ...(kind==='calendar'?{page,total:Number.isFinite(data.count)?data.count:items.length,nextPage:data.next&&page<1000?page+1:null}:{})};
}
Deno.serve(async(request:Request)=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Cache-Control':status===200?'public, max-age=300':'no-store'}});
 if(request.method!=='GET')return respond({error:'Use GET.'},405);
 const now=new Date();let selection;
 try{selection=radarRequest(new URL(request.url).searchParams,now);}catch{return respond({error:'Invalid category, month, day or page.'},400);}
 const {kind}=selection,key='content-v2:'+selection.cacheKey;
 const {data:stored}=await db.from('discovery_cache').select('*').eq('key',key).maybeSingle();
 if(stored && Date.parse(stored.expires_at)>Date.now())return respond(stored.payload);
 try{
  if(!pending.has(key))pending.set(key,(async()=>{
   const payload=await collect(selection,now);
   await db.from('discovery_cache').upsert({key,payload,updated_at:payload.updatedAt,expires_at:new Date(Date.now()+(kind==='trending'?600000:21600000)).toISOString()});
   return payload;
  })().finally(()=>pending.delete(key)));
  return respond(await pending.get(key));
 }catch{
  if(stored && Date.now()-Date.parse(stored.updated_at)<86400000)return respond({...stored.payload,stale:true});
  return respond({error:'Game data is temporarily unavailable. Please try again later.'},503);
 }
});
