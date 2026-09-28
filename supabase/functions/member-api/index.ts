import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {metadata} from '../game-metadata/metadata.mjs';
import {excludedExternalContent} from '../_shared/content-policy.mjs';
import {normalizeGenres} from '../../../lib/genres.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
async function rawg(path:string,params:Record<string,string>={}){
 const key='member-v1:'+path+':'+new URLSearchParams(params);
 const {data:cache}=await db.from('discovery_cache').select('payload,expires_at').eq('key',key).maybeSingle();
 if(cache&&Date.parse(cache.expires_at)>Date.now())return cache.payload;
 const r=await fetch('https://api.rawg.io/api/'+path+'?'+new URLSearchParams({...params,key:Deno.env.get('RAWG_API_KEY')!}),{signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error('Unavailable');const data=await r.json();
 await db.from('discovery_cache').upsert({key,payload:data,expires_at:new Date(Date.now()+3600000).toISOString(),updated_at:new Date().toISOString()});return data;
}
Deno.serve(async(request:Request)=>{
 const origin=request.headers.get('Origin')||'',allowed=[Deno.env.get('ADMIN_ORIGIN'),'http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:4175'];
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed.includes(origin)?origin:'','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!allowed.includes(origin))return reply(403,{error:'Origin not allowed.'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply(405,{error:'Use POST.'});
 try{
  const token=request.headers.get('Authorization')||'';if(!token.startsWith('Bearer '))return reply(401,{error:'Sign in to continue.'});
  const {data:{user},error}=await db.auth.getUser(token.slice(7));if(error||!user||!user.email_confirmed_at)return reply(401,{error:'Sign in to continue.'});
  const {data:profile}=await db.from('member_profiles').select('is_active').eq('id',user.id).maybeSingle();
  const {data:admin}=await db.from('admin_profiles').select('role,is_active').eq('id',user.id).maybeSingle();
  if(!profile?.is_active||admin?.is_active===false)return reply(403,{error:'Your account is blocked. Contact an administrator.'});
  const text=await request.text();if(text.length>2048)return reply(400,{error:'Request too large.'});
  let body;try{body=JSON.parse(text);}catch{return reply(400,{error:'Invalid request.'});}
  if(!body||typeof body!=='object')return reply(400,{error:'Invalid request.'});
  const {error:limit}=await db.rpc('member_api_limit',{target:user.id});if(limit)return reply(429,{error:'Too many requests. Wait a minute and try again.'});
  if(body.action==='search'){
   const query=typeof body.query==='string'?body.query.trim():'';if(query.length<2||query.length>100)return reply(400,{error:'Enter 2–100 characters.'});
   const {data:catalog,error}=await db.from('games').select('id,title,release_year,poster,rawg_id').ilike('title','%'+query.replace(/[%_\\]/g,'')+'%').order('title').limit(30);if(error)throw error;
   let suggestions=[],warning='';
   if(body.rawg===true)try{const result=await rawg('games',{search:query,search_precise:'true',page_size:'12'});if(!Array.isArray(result.results))throw new Error();suggestions=result.results.filter(g=>!excludedExternalContent(g)).map(g=>metadata(g)).filter(g=>!catalog.some(c=>c.rawg_id===g.rawgId)).map(g=>({rawgId:g.rawgId,title:g.title,year:g.year,poster:g.poster}));}catch{warning='RAWG suggestions are unavailable. Shared catalog results are still available.';}
   return reply(200,{catalog,suggestions,warning});
  }
  if(body.action==='import'){
   if(!Number.isSafeInteger(body.rawgId)||body.rawgId<1)return reply(400,{error:'Choose a game from RAWG.'});
   const {data:existing}=await db.from('games').select('id').eq('rawg_id',body.rawgId).maybeSingle();
   let result;
   if(existing){const caller=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:token}},auth:{persistSession:false}});result=await caller.rpc('add_collection_game',{selected_game:existing.id});}
   else{const game=metadata(await rawg('games/'+body.rawgId));game.genres=normalizeGenres(game.genres);result=await db.rpc('import_member_game',{target:user.id,details:game});}
   if(result.error)return reply(409,{error:'Could not add this game. Daily limits: 20 new imports, 100 additions, and 1,000 games per collection. Try the shared catalog or retry later.'});
   return reply(200,{gameId:result.data});
  }
  if(!admin?.is_active)return reply(403,{error:'Administrator access required.'});
  if(body.action==='members'){
   const page=Number.isInteger(body.page)&&body.page>=0&&body.page<10000?body.page:0;
   const {data,error}=await db.from('member_profiles').select('*').order('created_at',{ascending:false}).range(page*50,page*50+49);if(error)throw error;
   const {data:admins,error:adminError}=await db.from('admin_profiles').select('id');if(adminError)throw adminError;
   return reply(200,{members:data.filter(p=>!admins.some(a=>a.id===p.id)),hasMore:data.length===50});
  }
  if(!['collection','block','unblock','delete','reset-password'].includes(body.action)||typeof body.userId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.userId))return reply(400,{error:'Choose a member and action.'});
  const {data:targetAdmin,error:targetError}=await db.from('admin_profiles').select('id').eq('id',body.userId).maybeSingle();if(targetError)throw targetError;
  if(targetAdmin||body.userId===user.id)return reply(403,{error:'Use administrator account management for this account.'});
  if(body.action==='collection'){const {data,error}=await db.from('collection_entries').select('status,games(id,title)').eq('user_id',body.userId).order('game_id').limit(1000);if(error)throw error;return reply(200,{entries:data});}
  const {data:target,error:lookupError}=await db.auth.admin.getUserById(body.userId);if(lookupError||!target.user)return reply(404,{error:'Member not found.'});
  if(body.action==='block'||body.action==='unblock'){
   const active=body.action==='unblock';
   if(!active){const {error}=await db.from('member_profiles').update({is_active:false}).eq('id',body.userId);if(error)throw error;}
   const {error}=await db.auth.admin.updateUserById(body.userId,{ban_duration:active?'none':'876000h'});if(error)throw error;
   if(active){const {error}=await db.from('member_profiles').update({is_active:true}).eq('id',body.userId);if(error)throw error;}
  }else if(body.action==='delete'){
   const {error}=await db.auth.admin.deleteUser(body.userId);if(error)throw error;
  }else{
   if(typeof body.password!=='string'||body.password.length<12||body.password.length>256)return reply(400,{error:'Use a temporary password of 12–256 characters.'});
   const {error}=await db.auth.admin.updateUserById(body.userId,{password:body.password});if(error)return reply(400,{error:'Could not reset the password. Choose a stronger password and retry.'});
  }
  await db.from('activity_log').insert({actor_id:user.id,entity:'member',entity_id:body.userId,action:body.action,label:'Member account'});
  return reply(200,{success:true});
 }catch{return reply(503,{error:'The request could not be completed. Please try again shortly.'});}
});
