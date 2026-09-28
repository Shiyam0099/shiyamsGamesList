import test from 'node:test';import assert from 'node:assert/strict';
import {exactMatch,metadata,monthlyPatch} from '../supabase/functions/game-metadata/metadata.mjs';
const now=new Date('2026-09-20T12:00:00Z');
const g={id:5,name:'Example Game',released:'2026-09-19',slug:'example-game',genres:[{name:'Action'}],description_raw:'Description',background_image:'https://media.rawg.io/media/example.jpg',metacritic:88,metacritic_url:'https://www.metacritic.com/game/example-game/'};
test('automatic matching rejects ambiguous games and different editions/years',()=>{
 const row={title:'Example Game',release_year:2026};assert.equal(exactMatch(row,[g]).id,5);
 assert.equal(exactMatch(row,[g,{...g,id:6}]),null);assert.equal(exactMatch(row,[{...g,name:'Example Game Remastered'}]),null);assert.equal(exactMatch(row,[{...g,released:'2025-09-19'}]),null);
});
test('autofill derives date/future flags, limits descriptions and strips unsafe URLs',()=>{
 const d=metadata(g,now);assert.equal(d.future,false);assert.equal(d.year,'2026');assert.equal(d.metacritic,88);
 assert.equal(metadata({...g,released:'2026-09-21'},now).future,true);assert.equal(metadata({...g,released:null},now).future,true);assert.equal(metadata({...g,tba:true},now).future,true);
 const invalid=metadata({...g,metacritic:0,background_image:'javascript:alert(1)',metacritic_url:'https://attacker.example',description_raw:'a'.repeat(6000)},now);assert.equal(invalid.metacritic,null);assert.equal(invalid.poster,'');assert.equal(invalid.ratingUrl,'');assert.equal(invalid.description.length,5000);
 assert.throws(()=>metadata({...g,tags:[{name:'Sexual Content'}]},now));
});
test('monthly updates preserve personal fields and missing scores; correct delays',()=>{
 const row={title:'Example Game',status:'loved',poster:'custom',description:'custom',video_id:'abcdefghijk',critic_video_url:'https://youtube.com/custom',genres:['RPG'],metacritic:90};
 const patch=monthlyPatch(row,metadata(g,now),now);assert.equal(patch.future,false);assert.equal(patch.metacritic,88);
 for(const key of ['status','title','poster','description','genres','video_id','critic_video_url'])assert.equal(patch[key],undefined);
 assert.equal(monthlyPatch(row,metadata({...g,released:'2025-09-19'},now),now),null);
 const delayed=monthlyPatch({...row,release_date:'2026-09-19'},metadata({...g,released:'2027-02-01',metacritic:null},now),now);assert.equal(delayed.future,true);assert.equal(delayed.release_year,2027);assert.equal(delayed.metacritic,undefined);
 assert.deepEqual(monthlyPatch({...row,...patch},metadata(g,now),now),{});
});
