import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {required,serverURL,run} from './environment.mjs';
await run(async()=>{
 const options={auth:{persistSession:false,autoRefreshToken:false}},url=serverURL(),key=required('VITE_SUPABASE_PUBLISHABLE_KEY');
 const service=createClient(url,required('SUPABASE_SERVICE_ROLE_KEY'),options),admin=createClient(url,key,options),users=[];
 const check=r=>{if(r.error)throw {code:'MEMBER_VERIFY_'+(r.error.code||'REQUEST')};return r.data;};
 const invoke=async(client,body)=>{const {data:{session}}=await client.auth.getSession();const r=await fetch(url+'/functions/v1/member-api',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,Origin:required('ADMIN_ORIGIN'),'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 const before=check(await service.from('games').select('id,title,status,is_featured').order('id'));
 try{
  for(let i=0;i<2;i++){
   const client=createClient(url,key,options),email='collection-test-'+randomUUID()+'@example.com',password=randomUUID()+'Aa9!';
   const result=check(await client.auth.signUp({email,password}));
   if(result.user)users.push({client,id:result.user.id,email});
   assert.ok(result.session,'Signup must return a session without email confirmation');
   assert.equal(check(await client.from('member_profiles').select('is_active').eq('id',result.user.id).single()).is_active,true);
  }
  const [one,two]=users,game=check(await service.from('games').select('id,rawg_id').not('rawg_id','is',null).limit(1))[0];
  await Promise.all([one,two].map(async u=>{check(await u.client.rpc('add_collection_game',{selected_game:game.id}));check(await u.client.rpc('add_collection_game',{selected_game:game.id}));}));
  assert.equal(check(await one.client.from('collection_entries').select('*')).length,1);
  check(await one.client.rpc('set_collection_status',{selected_game:game.id,new_status:'playing'}));
  check(await one.client.rpc('update_member_profile',{new_name:'Collection test',new_bio:'Temporary automated test profile',new_avatar:49}));
  assert.equal(check(await two.client.from('collection_entries').select('status'))[0].status,'unplayed');
  const edited=await one.client.from('games').update({title:'Must not be allowed'}).eq('id',game.id).select('id');assert.ok(edited.error||edited.data.length===0);
  const imported=await invoke(one.client,{action:'import',rawgId:game.rawg_id});assert.equal(imported.status,200);assert.equal(Number(imported.data.gameId),Number(game.id));
  assert.equal((await invoke(one.client,{action:'members'})).status,403);
  check(await admin.auth.signInWithPassword({email:required('SUPER_ADMIN_EMAIL'),password:required('SUPER_ADMIN_PASSWORD')}));
  assert.equal((await invoke(admin,{action:'collection',userId:one.id})).data.entries.length,1);
  assert.equal((await invoke(admin,{action:'block',userId:one.id})).status,200);
  assert.ok((await one.client.rpc('add_collection_game',{selected_game:game.id})).error);
  assert.equal((await invoke(admin,{action:'unblock',userId:one.id})).status,200);
  const newPassword=randomUUID()+'Aa9!';assert.equal((await invoke(admin,{action:'reset-password',userId:one.id,password:newPassword})).status,200);
  check(await one.client.auth.signInWithPassword({email:one.email,password:newPassword}));
  assert.equal((await invoke(admin,{action:'delete',userId:one.id})).status,200);
  assert.equal(check(await service.from('collection_entries').select('*').eq('user_id',one.id)).length,0);
  assert.equal(check(await two.client.from('collection_entries').select('*')).length,1);
  assert.deepEqual(check(await service.from('games').select('id,title,status,is_featured').order('id')),before);
  console.log('PASS: live immediate signup without SMTP; private collections; duplicate reuse; profile/status updates; denied metadata edits; admin block/unblock, temporary-password reset and deletion. Public catalog unchanged.');
 }finally{
  let failed=false;
  for(const u of users){await u.client.auth.signOut({scope:'local'});const {data}=await service.auth.admin.getUserById(u.id);if(data?.user){const {error}=await service.auth.admin.deleteUser(u.id);if(error)failed=true;}}
  await admin.auth.signOut({scope:'local'});if(failed)throw {code:'TEST_ACCOUNT_CLEANUP_FAILED'};
  console.log('Temporary test accounts and personal collections removed. No emails sent.');
 }
});
