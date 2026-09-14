import test from 'node:test';import assert from 'node:assert/strict';
import {excludedExternalContent} from '../supabase/functions/_shared/content-policy.mjs';
import {rawgGames} from '../supabase/functions/gaming-radar/radar-data.mjs';
import {anticipatedShowcase} from '../lib/hero-data.mjs';
test('external content policy covers explicit metadata and titles without treating all mature games as sexual',()=>{
 for(const g of [{title:'Hentai Puzzle'},{name:'Explicit',tags:[{slug:'sexual-content'}]},{esrb_rating:{id:5}},{content_descriptors:{ids:[3]}},{content_descriptors:{ids:[4]}},{tags:['Nudity']},{title:'Adult-only adventure'}])assert.equal(excludedExternalContent(g),true);
 for(const g of [{title:'Sextant Adventure'},{name:'Mature action',esrb_rating:{id:4},tags:[{name:'Violent'}]},{content_descriptors:{ids:[2,5]}},{title:'Unrated adventure'},null])assert.equal(excludedExternalContent(g),false);
});
test('RAWG lists and hero remove flagged entries before rendering',()=>{
 const results=[{id:1,name:'Safe',released:'2026-09-20',added:1},{id:2,name:'NSFW Game',released:'2026-09-20',added:1000}];assert.deepEqual(rawgGames({results},'anticipated',new Date('2026-09-01')).map(g=>g.id),[1]);
 assert.deepEqual(anticipatedShowcase(results.map(g=>({...g,title:g.name,releaseDate:g.released})),new Date('2026-09-01')).map(g=>g.id),[1]);
});
