import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const superId='00000000-0000-0000-0000-000000000001',adminId='00000000-0000-0000-0000-000000000002',strangerId='00000000-0000-0000-0000-000000000003';
test('PostgreSQL enforces public, admin, inactive and single-Super-Admin boundaries',async(t)=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to public;`);
  await db.exec(await readFile(new URL('../supabase/migrations/202609130001_initial.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609140001_discovery_cache.sql',import.meta.url),'utf8'));
  await db.query('insert into auth.users values ($1,$2),($3,$4),($5,$6)',[superId,'super@example.test',adminId,'admin@example.test',strangerId,'stranger@example.test']);
  await db.query('select public.bootstrap_super_admin($1,$2)',[superId,'Super']);
  await db.query("insert into public.admin_profiles(id,email,username) values($1,'admin@example.test','Admin')",[adminId]);
  await db.exec("insert into public.games(id,title,genres,status) values(1,'One',array['RPG'],'playing'),(2,'Two',array['Action'],'unplayed'),(3,'Three',array['Puzzle'],'loved')");
  async function as(role,id,sql,params=[]){await db.exec(`set role ${role}`);try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id || '']);return await db.query(sql,params);}finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");}}
  await t.test('discovery cache is writable only by the server role',async()=>{
   for(const role of ['anon','authenticated']){await assert.rejects(as(role,null,'select * from discovery_cache'));await assert.rejects(as(role,null,"insert into discovery_cache(key,payload,expires_at) values('test','{}',now())"));}
   await as('service_role',null,"insert into discovery_cache(key,payload,expires_at) values('test','{}',now())");
   assert.equal((await as('service_role',null,'select * from discovery_cache')).rows.length,1);
  });
  await t.test('anonymous can read games and cannot write or read private profiles',async()=>{
   assert.equal((await as('anon',null,'select * from games')).rows.length,3);
   await assert.rejects(as('anon',null,"insert into games(title,genres) values('bad',array['RPG'])"));
   await assert.rejects(as('anon',null,"update games set title='bad' where id=1"));
   await assert.rejects(as('anon',null,'delete from games where id=1'));
   await assert.rejects(as('anon',null,'select * from admin_profiles'));
   await assert.rejects(as('anon',null,'select public.set_currently_playing(array[2]::bigint[])'));
  });
  await t.test('authenticated non-admin has no write access, including direct RPC',async()=>{
   await assert.rejects(as('authenticated',strangerId,"insert into games(title,genres) values('bad',array['RPG'])"));
   assert.equal((await as('authenticated',strangerId,"update games set title='bad' where id=1 returning id")).rows.length,0);
   await assert.rejects(as('authenticated',strangerId,'select public.set_currently_playing(array[2]::bigint[])'));
  });
  await t.test('ordinary admin can CRUD games and change own username but cannot promote or manage users',async()=>{
   await as('authenticated',adminId,"insert into games(id,title,genres) values(10,'New',array['RPG'])");
   assert.equal((await as('authenticated',adminId,"update games set title='Edited' where id=10 returning title")).rows[0].title,'Edited');
   assert.equal((await as('authenticated',adminId,'delete from games where id=10 returning id')).rows.length,1);
   await as('authenticated',adminId,"select update_my_username('Renamed')");
   assert.equal((await as('authenticated',adminId,'select * from admin_profiles')).rows.length,1);
   await assert.rejects(as('authenticated',adminId,"update admin_profiles set role='super_admin' where id=$1",[adminId]));
   await assert.rejects(as('authenticated',adminId,"select manage_admin_profile($1,'Other',false)",[superId]));
   await assert.rejects(as('authenticated',adminId,"select bootstrap_super_admin($1,'Other')",[adminId]));
  });
  await t.test('currently-playing saves multiple selections atomically and rejects nonexistent IDs',async()=>{
   await as('authenticated',adminId,'select set_currently_playing(array[2,3]::bigint[])');
   assert.deepEqual((await db.query('select status from games order by id')).rows.map(r=>r.status),['unplayed','playing','playing']);
   await assert.rejects(as('authenticated',adminId,'select set_currently_playing(array[1,999]::bigint[])'));
   assert.deepEqual((await db.query('select status from games order by id')).rows.map(r=>r.status),['unplayed','playing','playing']);
   await as('authenticated',adminId,'select set_currently_playing(array[]::bigint[])');
   assert.equal((await db.query("select * from games where status='playing'")).rows.length,0);
  });
  await t.test('deactivation immediately denies existing authenticated identity',async()=>{
   await as('authenticated',superId,"select manage_admin_profile($1,'Renamed',false)",[adminId]);
   await assert.rejects(as('authenticated',adminId,"insert into games(title,genres) values('bad',array['RPG'])"));
   assert.equal((await as('authenticated',adminId,'delete from games where id=1 returning id')).rows.length,0);
   await assert.rejects(as('authenticated',adminId,'select set_currently_playing(array[1]::bigint[])'));
   await assert.rejects(as('authenticated',adminId,"select update_my_username('Blocked')"));
   assert.equal((await as('authenticated',adminId,'select * from activity_log')).rows.length,0);
  });
  await t.test('even privileged operations cannot create, demote, deactivate, cascade-delete or truncate away the Super Admin',async()=>{
   await assert.rejects(db.query("insert into admin_profiles(id,email,username,role) values($1,'x@y.test','Second','super_admin')",[strangerId]));
   await assert.rejects(db.query("update admin_profiles set role='admin' where id=$1",[superId]));
   await assert.rejects(db.query('update admin_profiles set is_active=false where id=$1',[superId]));
   await assert.rejects(db.query('delete from admin_profiles where id=$1',[superId]));
   await assert.rejects(db.query('delete from auth.users where id=$1',[superId]));
   await assert.rejects(db.exec('truncate admin_profiles'));
   assert.equal((await db.query("select * from admin_profiles where role='super_admin' and is_active")).rows.length,1);
  });
  await t.test('email changes mirror Auth, audit is immutable, imported IDs do not collide',async()=>{
   await db.query("update auth.users set email='changed@example.test' where id=$1",[adminId]);
   assert.equal((await db.query('select email from admin_profiles where id=$1',[adminId])).rows[0].email,'changed@example.test');
   await assert.rejects(as('authenticated',superId,'delete from activity_log'));
   await db.exec('select sync_games_sequence()');
   assert.ok(Number((await as('authenticated',superId,"insert into games(title,genres) values('Next',array['RPG']) returning id")).rows[0].id)>3);
  });
 }finally{await db.close();}
});
