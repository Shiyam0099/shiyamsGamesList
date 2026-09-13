import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {database,run} from './environment.mjs';
await run(async()=>{
 const db=await database();try{
  await db.query('begin');await db.query("select pg_advisory_xact_lock(736192841)");
  await db.query('create schema if not exists private; revoke all on schema private from public; create table if not exists private.app_migrations(name text primary key, checksum text not null, applied_at timestamptz default now())');
  for(const name of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()){
   const sql=await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');const checksum=createHash('sha256').update(sql).digest('hex');
   const existing=await db.query('select checksum from private.app_migrations where name=$1',[name]);
   if(existing.rowCount){if(existing.rows[0].checksum!==checksum)throw new Error('Migration checksum changed');console.log(`${name}: already applied`);continue;}
   await db.query(sql);await db.query('insert into private.app_migrations(name,checksum) values($1,$2)',[name,checksum]);console.log(`${name}: applied`);
  }
  await db.query('commit');
 }catch(e){await db.query('rollback');throw e;}finally{await db.end();}
});
