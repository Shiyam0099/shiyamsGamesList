import test from 'node:test';import assert from 'node:assert/strict';
import {dateWindow,rawgGames,steamRanks,radarRequest} from '../supabase/functions/gaming-radar/radar-data.mjs';
test('release windows handle UTC year rollover and leap months',()=>{assert.deepEqual(dateWindow('month',new Date('2028-02-29T23:00:00Z')),{start:'2028-02-01',end:'2028-02-29',key:'2028-02'});assert.equal(dateWindow('anticipated',new Date('2026-12-31')).end,'2026-12-31');assert.equal(dateWindow('month',new Date('2027-01-01')).start,'2027-01-01');});
test('release filtering excludes other periods, deduplicates and sorts by interest',()=>{const games=[{id:1,name:'Earlier',released:'2026-09-01',added:50},{id:2,name:'Soon',released:'2026-09-20',added:20},{id:3,name:'Later',released:'2026-10-20',added:100},{id:4,name:'TBA',released:null},{id:5,name:'Next year',released:'2027-01-01'}];assert.deepEqual(rawgGames({results:games},'month',new Date('2026-09-14')).map(g=>g.id),[1,2]);assert.deepEqual(rawgGames({results:[...games,games[1]]},'anticipated',new Date('2026-09-14')).map(g=>g.id),[3,2]);});
test('malformed upstream responses rejected, remote image hosts excluded',()=>{assert.throws(()=>steamRanks({}));assert.throws(()=>rawgGames({}));assert.equal(rawgGames({results:[{id:1,name:'Test',released:'2026-09-20',background_image:'javascript:alert(1)'}]},'month',new Date('2026-09-01'))[0].image,'');});

test('previous calendar year handles January rollover and excludes adjacent years',()=>{
 const now=new Date('2027-01-01T00:00:00Z');assert.deepEqual(dateWindow('last-year',now),{start:'2026-01-01',end:'2026-12-31',key:'2026'});
 const results=[{id:1,name:'Old',released:'2025-12-31',added:999},{id:2,name:'First',released:'2026-01-01',added:10},{id:3,name:'Last',released:'2026-12-31',added:20},{id:4,name:'New',released:'2027-01-01',added:999}];assert.deepEqual(rawgGames({results},'last-year',now).map(g=>g.id),[3,2]);
});
test('Top 250 uses critic scores, excludes unscored games, and preserves ties',()=>{
 const results=[{id:1,name:'One',metacritic:98},{id:2,name:'Two',metacritic:null},{id:3,name:'Three',metacritic:99},{id:4,name:'Four',metacritic:98},{id:5,name:'Invalid',metacritic:101}];assert.deepEqual(rawgGames({results:[...results,results[0]]},'top250').map(g=>g.id),[3,1,4]);
});
test('calendar validates dates/pages and partitions caches by month, day and page',()=>{
 const read=q=>radarRequest(new URLSearchParams(q),new Date('2028-02-01'));
 assert.equal(read('kind=calendar&month=2028-02&day=29&page=2').period.end,'2028-02-29');
 assert.notEqual(read('kind=calendar&page=1').cacheKey,read('kind=calendar&page=2').cacheKey);
 assert.notEqual(read('kind=calendar').cacheKey,read('kind=calendar&day=01').cacheKey);
 for(const query of ['kind=nope','kind=calendar&month=2026-13','kind=calendar&month=2026-02&day=29','kind=calendar&page=0','kind=calendar&page=1001','kind=calendar&day=00'])assert.throws(()=>read(query));
});

test('calendar filter validation and cache isolation',()=>{
 const read=q=>radarRequest(new URLSearchParams('kind=calendar&'+q));
 const keys=['','order=popular','platform=pc','popular=1'].map(q=>read(q).cacheKey);assert.equal(new Set(keys).size,4);
 for(const q of ['order=bad','platform=9999','popular=yes'])assert.throws(()=>read(q));
 const results=[{id:1,name:'B',released:'2026-09-20',added:10},{id:2,name:'A',released:'2026-09-01',added:500}];assert.deepEqual(rawgGames({results},'calendar',new Date('2026-09-01')).map(g=>g.id),[1,2]);
});
