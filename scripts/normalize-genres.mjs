import {writeFile} from 'node:fs/promises';
import {normalizeGenres} from '../lib/genres.mjs';
import {database,run} from './environment.mjs';
await run(async()=>{
 const db=await database(),apply=process.argv.includes('--apply');
 try{
  await db.query('begin');if(apply)await db.query('lock table public.games in share row exclusive mode');
  const {rows}=await db.query('select id,title,genres from public.games order by id');
  const changes=rows.map(g=>({...g,next:normalizeGenres(g.genres)})).filter(g=>JSON.stringify(g.genres)!==JSON.stringify(g.next));
  if(changes.some(g=>!g.next.length || g.next.length>30))throw {code:'INVALID_NORMALIZED_GENRES'};
  const mapping=new Map();for(const g of changes)for(const genre of g.genres){const next=normalizeGenres([genre]);if(JSON.stringify(next)!==JSON.stringify([genre]))mapping.set(genre,next);}
  console.log(JSON.stringify({games:rows.length,changed:changes.length,mappings:Object.fromEntries(mapping)},null,2));
  if(apply && changes.length){
   const backup='/private/tmp/shiyams-genres-'+Date.now()+'.json';await writeFile(backup,JSON.stringify(changes.map(({id,title,genres})=>({id,title,genres})),null,2),{mode:0o600});
   for(const g of changes)await db.query('update public.games set genres=$1 where id=$2',[g.next,g.id]);
   const {rows:verified}=await db.query('select genres from public.games');
   if(verified.length!==rows.length || verified.some(g=>JSON.stringify(g.genres)!==JSON.stringify(normalizeGenres(g.genres))))throw {code:'GENRE_VERIFICATION_FAILED'};
   console.log(`Updated and verified ${changes.length} games. Original genre backup: ${backup}`);
  }
  await db.query('commit');
 }catch(e){await db.query('rollback');throw e;}finally{await db.end();}
});
