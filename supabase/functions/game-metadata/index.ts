import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {excludedExternalContent} from '../_shared/content-policy.mjs';
import {exactMatch,metadata,monthlyPatch} from './metadata.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const pending=new Map();
async function rawg(path:string,params:Record<string,string>={}){
 const cacheKey='metadata-v1:'+path+':'+new URLSearchParams(params);
 const {data:stored}=await db.from('discovery_cache').select('payload,expires_at').eq('key',cacheKey).maybeSingle();
 if(stored&&Date.parse(stored.expires_at)>Date.now())return stored.payload;
 if(!pending.has(cacheKey))pending.set(cacheKey,(async()=>{
  const key=Deno.env.get('RAWG_API_KEY');if(!key)throw new Error('Unavailable');
  const response=await fetch('https://api.rawg.io/api/'+path+'?'+new URLSearchParams({...params,key}),{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Unavailable');const data=await response.json();
  await db.from('discovery_cache').upsert({key:cacheKey,payload:data,updated_at:new Date().toISOString(),expires_at:new Date(Date.now()+3600000).toISOString()});return data;
 })().finally(()=>pending.delete(cacheKey)));
 return pending.get(cacheKey);
}
Deno.serve(async(request:Request)=>{
 const origin=request.headers.get('Origin')||'',allowed=[Deno.env.get('ADMIN_ORIGIN'),'http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:4175'];
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed.includes(origin)?origin:'','Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
 const respond=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!allowed.includes(origin))return respond(403,{error:'Origin not allowed.'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return respond(405,{error:'Use POST.'});
 const authorization=request.headers.get('Authorization')||'';if(!authorization.startsWith('Bearer '))return respond(401,{error:'Sign in to continue.'});
 const {data:{user},error}=await db.auth.getUser(authorization.slice(7));if(error||!user)return respond(401,{error:'Sign in again.'});
 const {data:profile}=await db.from('admin_profiles').select('role,is_active').eq('id',user.id).maybeSingle();
 if(!profile?.is_active||!['admin','super_admin'].includes(profile.role))return respond(403,{error:'Active administrator required.'});
 // Writes use the caller's JWT: database RLS, deactivation and audit actor remain authoritative.
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
 let body;try{const text=await request.text();if(text.length>4096)return respond(400,{error:'Request too large.'});body=JSON.parse(text);}catch{return respond(400,{error:'Invalid request.'});}
 try{
  if(body.action==='search'){
   const q=typeof body.query==='string'?body.query.trim():'';if(q.length<2||q.length>150)return respond(400,{error:'Enter 2–150 characters.'});
   const data=await rawg('games',{search:q,search_precise:'true',page_size:'12'});if(!Array.isArray(data.results))throw new Error('Unavailable');
   return respond(200,{items:data.results.filter(g=>!excludedExternalContent(g)).map(g=>metadata(g)).map(({rawgId,title,year,poster,source})=>({rawgId,title,year,poster,source}))});
  }
  if(body.action==='details'){
   if(!Number.isSafeInteger(body.rawgId)||body.rawgId<1)return respond(400,{error:'Select a game.'});
   return respond(200,{game:metadata(await rawg('games/'+body.rawgId))});
  }
  if(body.action==='sync-game'){
   if(!Number.isSafeInteger(body.gameId)||body.gameId<1)return respond(400,{error:'Select a listed game.'});
   const {data:row,error}=await client.from('games').select('*').eq('id',body.gameId).single();if(error)return respond(404,{error:'Game unavailable.'});
   let rawgId=row.rawg_id;
   if(!rawgId){const search=await rawg('games',{search:row.title,search_precise:'true',page_size:'20'});if(!Array.isArray(search.results))throw new Error('Unavailable');rawgId=exactMatch(row,search.results)?.id;}
   if(!rawgId)return respond(200,{status:'unmatched',title:row.title,message:'No unique title/year match. Select a RAWG match in Edit game.'});
   const data=metadata(await rawg('games/'+rawgId)),patch=monthlyPatch(row,data);
   if(patch===null)return respond(200,{status:'skipped',title:row.title,message:'Not a release for this UTC month.'});
   if(!Object.keys(patch).length)return respond(200,{status:'unchanged',title:row.title,message:'Already up to date.'});
   const changes=Object.keys(patch);patch.metadata_checked_at=new Date().toISOString();
   const {data:updated,error:updateError}=await client.from('games').update(patch).eq('id',row.id).eq('updated_at',row.updated_at).select('id').maybeSingle();
   if(updateError)return respond(409,{error:'Could not save this game. Check permissions or duplicate title/year.'});
   if(!updated)return respond(200,{status:'conflict',title:row.title,message:'Changed during refresh; skipped to protect the other edit.'});
   return respond(200,{status:'updated',title:row.title,changes,message:'Updated '+changes.join(', ')});
  }
  return respond(400,{error:'Unsupported action.'});
 }catch{return respond(503,{error:'Game metadata is temporarily unavailable. Try again shortly.'});}
});
