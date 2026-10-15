import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {database,run} from './environment.mjs';

// Import only individually reviewed, verified matches. Never replace an existing link.
await run(async()=>{
 const report=JSON.parse(await readFile(new URL('../reports/game-media-matches.json',import.meta.url),'utf8'));
 const apply=process.argv.includes('--apply');
 assert.equal(new Set(report.matched.map(g=>g.id)).size,report.matched.length);
 const db=await database();
 try{
  await db.query('begin');
  if(apply)await db.query('lock table public.games in share row exclusive mode');
  const {rows:before}=await db.query('select to_jsonb(g) as game from public.games g order by id');
  const originals=new Map(before.map(({game})=>[String(game.id),game])),changes=[];
  for(const match of report.matched){
   const current=originals.get(String(match.id));
   assert.ok(current,`Missing game ${match.id}`);assert.equal(current.title,match.title);
   const patch={};
   for(const [kind,column] of [['trailer','video_id'],['review','critic_video_url']]){
    const video=match[kind];if(!video)continue;
    assert.match(video.videoId,/^[\w-]{11}$/);assert.equal(video.url,'https://www.youtube.com/watch?v='+video.videoId);
    assert.ok(video.title&&video.channel&&video.verifiedAt&&video.embedMetadataAvailable===true,`Unverified ${kind} for ${match.id}`);
    const expected=kind==='trailer'?video.videoId:video.url;
    if(current[column]===expected)continue;
    assert.ok(!current[column],`${kind} was filled since matching: ${match.id}`);
    patch[column]=expected;
    if(kind==='trailer'){
     if(!current.video_channel)patch.video_channel=video.channel;
     if(!current.video_source)patch.video_source=video.url;
    }
   }
   if(Object.keys(patch).length)changes.push({id:match.id,title:match.title,patch});
  }
  console.log(JSON.stringify({games:before.length,changes:changes.length,trailers:changes.filter(g=>g.patch.video_id).length,reviews:changes.filter(g=>g.patch.critic_video_url).length}));
  if(apply&&changes.length){
   const backup='/private/tmp/shiyams-media-backup-'+Date.now()+'.json';
   await writeFile(backup,JSON.stringify(changes.map(g=>originals.get(String(g.id))),null,2),{mode:0o600});
   for(const {id,patch} of changes){const keys=Object.keys(patch);await db.query(`update public.games set ${keys.map((key,i)=>`${key}=$${i+1}`).join(',')} where id=$${keys.length+1}`,[...keys.map(k=>patch[k]),id]);}
   const {rows:after}=await db.query('select to_jsonb(g) as game from public.games g order by id');
   assert.equal(after.length,before.length);
   const patches=new Map(changes.map(g=>[String(g.id),g.patch]));
   for(const {game} of after){const patch=patches.get(String(game.id));assert.deepEqual(game,{...originals.get(String(game.id)),...patch,...(patch?{updated_at:game.updated_at}:{})});}
   console.log(`Verified every game: only intended media fields and timestamps changed. Backup: ${backup}`);
  }
  await db.query('commit');console.log(apply?'Media additions committed.':'Dry run passed.');
 }catch(e){await db.query('rollback');if(e.code==='ERR_ASSERTION')console.error(e.message);throw e;}finally{await db.end();}
});
