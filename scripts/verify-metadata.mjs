import {createClient} from '@supabase/supabase-js';import {required,serverURL,run} from './environment.mjs';
await run(async()=>{
 const url=serverURL()+'/functions/v1/game-metadata',origin=required('ADMIN_ORIGIN');
 const anon=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({action:'search',query:'Elden Ring'})});if(anon.status!==401)throw {code:'METADATA_ANON_ACCESS'};
 const client=createClient(serverURL(),required('VITE_SUPABASE_PUBLISHABLE_KEY'),{auth:{persistSession:false}});
 const {data,error}=await client.auth.signInWithPassword({email:required('SUPER_ADMIN_EMAIL'),password:required('SUPER_ADMIN_PASSWORD')});if(error)throw {code:'METADATA_LOGIN'};
 try{
  const request=async body=>{const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw {code:'METADATA_HTTP_'+r.status};return d;};
  const search=await request({action:'search',query:'Elden Ring'});const match=search.items?.find(g=>g.title==='Elden Ring');if(!match)throw {code:'METADATA_SEARCH'};
  const details=await request({action:'details',rawgId:match.rawgId});if(!details.game.poster||!details.game.genres.length||!details.game.description||!details.game.releaseDate)throw {code:'METADATA_DETAILS'};
  console.log('PASS: anonymous requests denied; active admin search and detail autofill work.');console.log(JSON.stringify({title:details.game.title,year:details.game.year,future:details.game.future,metacritic:details.game.metacritic,reviewPage:!!details.game.ratingUrl}));
  const {error:columnsError}=await client.from('games').select('id,rawg_id,release_date,metadata_checked_at').limit(1);if(columnsError)throw {code:'METADATA_COLUMNS'};console.log('PASS: deployed schema available. No collection records changed.');
 }finally{await client.auth.signOut({scope:'local'});}
});
