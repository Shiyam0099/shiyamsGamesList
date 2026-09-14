import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {database,run} from './environment.mjs';

// Reviewed mapping: no fuzzy matching or network discovery during import.
await run(async()=>{
 const filename=process.argv.includes('--alternatives')?'alternative-review-matches.json':'before-you-buy-matches.json';
 const report=JSON.parse(await readFile(new URL('../reports/'+filename,import.meta.url),'utf8'));
 const apply=process.argv.includes('--apply');
 assert.equal(new Set(report.matched.map(g=>g.id)).size,report.matched.length);
 for(const game of report.matched){
  assert.match(game.url,/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
  assert.ok(game.candidates.some(v=>v.url===game.url));
  assert.ok(game.candidates.every(v=>Date.parse(v.publishedAt)<=Date.parse(game.publishedAt)));
 }
 const db=await database();
 try{
  await db.query('begin');
  if(apply)await db.query('lock table public.games in share row exclusive mode');
  const {rows:before}=await db.query('select to_jsonb(g) as game from public.games g order by id');
  const originals=new Map(before.map(({game})=>[Number(game.id),game]));
  const changes=[];
  for(const match of report.matched){
   const current=originals.get(match.id);
   assert.ok(current,`Missing game ${match.id}`);
   assert.equal(current.title,match.title);
   if(current.critic_video_url===match.url)continue;
   assert.equal(current.critic_video_url || null,match.previousUrl || null,`Review changed since matching for ${match.id}`);
   changes.push(match);
  }
  console.log(`${report.matched.length} reviewed matches; ${changes.length} changes; ${report.unmatched.length} unmatched games preserved.`);
  if(apply && changes.length){
   const backup='/private/tmp/shiyams-critic-reviews-'+Date.now()+'.json';
   await writeFile(backup,JSON.stringify(changes.map(g=>({id:g.id,title:g.title,critic_video_url:originals.get(g.id).critic_video_url})),null,2),{mode:0o600});
   for(const g of changes)await db.query('update public.games set critic_video_url=$1 where id=$2',[g.url,g.id]);
   const {rows:after}=await db.query('select to_jsonb(g) as game from public.games g order by id');
   assert.equal(after.length,before.length);
   const updated=new Map(changes.map(g=>[g.id,g.url]));
   for(const {game} of after){
    const old=originals.get(Number(game.id));
    const expected={...old};
    if(updated.has(Number(game.id))){expected.critic_video_url=updated.get(Number(game.id));expected.updated_at=game.updated_at;}
    assert.deepEqual(game,expected);
   }
   console.log(`Verified all ${after.length} games: only intended critic URLs and update timestamps changed. Backup: ${backup}`);
  }
  await db.query('commit');
  console.log(apply?'Import committed.':'Dry run complete. Use --apply to save the reviewed URLs.');
 }catch(error){await db.query('rollback');if(error.code==='ERR_ASSERTION')console.error(error.message);throw error;}finally{await db.end();}
});
