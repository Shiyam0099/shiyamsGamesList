import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {toRow,validateGame} from '../lib/game-data.mjs';
import {database,run} from './environment.mjs';
await run(async()=>{
 const context={window:{}};vm.runInNewContext(await readFile(new URL('../games.js',import.meta.url),'utf8'),context);
 const source=JSON.parse(JSON.stringify(context.window.GAMES)).map(g=>toRow(validateGame(g),true));
 assert.equal(new Set(source.map(g=>g.id)).size,source.length,'Duplicate source IDs');
 const db=await database();let inserted=0;
 try{
  await db.query('begin');await db.query('lock table public.games in share row exclusive mode');
  for(const row of source){
   const keys=Object.keys(row);const result=await db.query(`insert into public.games (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) on conflict(id) do nothing returning *`,Object.values(row));
   if(result.rowCount){inserted++;for(const key of keys){const value=key==='id'?Number(result.rows[0][key]):key==='metacritic_checked' && result.rows[0][key] instanceof Date ? result.rows[0][key].toISOString().slice(0,10):result.rows[0][key];try{assert.deepEqual(value,row[key]);}catch{throw {code:`IMPORT_FIELD_${key.toUpperCase()}`};}}}
  }
  const matched=await db.query('select count(*)::int as count from public.games where id=any($1::bigint[])',[source.map(g=>g.id)]);
  assert.equal(matched.rows[0].count,source.length);
  await db.query('select public.sync_games_sequence()');
  const total=await db.query('select count(*)::int as count from public.games');
  await db.query('commit');console.log(`Verified ${matched.rows[0].count}/${source.length} source IDs; ${inserted} inserted; database total ${total.rows[0].count}. Existing rows preserved. Original games.js retained as a migration backup.`);
 }catch(e){await db.query('rollback');throw e;}finally{await db.end();}
});
