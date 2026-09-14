import {normalizeGenres} from '../lib/genres.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {fromRow,toRow,validateGame,videoID,gameService} from '../lib/game-data.mjs';
const context={window:{}};vm.runInNewContext(readFileSync(new URL('../games.js',import.meta.url),'utf8'),context);
const games=JSON.parse(JSON.stringify(context.window.GAMES));
test('all original game fields survive database mapping',()=>{
 for(const game of games){const mapped=fromRow(toRow(validateGame(game),true));for(const [key,value] of Object.entries(game))assert.deepEqual(mapped[key],key==='genres'?normalizeGenres(value):value,`${game.title}: ${key}`);}
 assert.equal(games.length,164);
 assert.equal(games.find(g=>g.title==='Evil West').status,'playing');
 assert.equal(games.find(g=>g.title==='A Plague Tale: Innocence').status,'playing');
});
test('game validation rejects invalid inputs and unsafe links',()=>{
 const game=games[0];for(const change of [{year:'20'},{year:'10000'},{status:'admin'},{metacritic:101},{metacritic:4.2},{genres:[]},{downloadLink:'javascript:alert(1)'},{poster:'https://user:password@example.com'},{videoId:'invalid'}])assert.throws(()=>validateGame({...game,...change}));
 assert.equal(videoID('https://www.youtube.com/watch?v=abcdefghijk'),'abcdefghijk');
 assert.throws(()=>videoID('https://attacker.example/watch?v=abcdefghijk'));
});
test('game API reads beyond the Supabase response limit',async()=>{
 const rows=Array.from({length:1201},(_,i)=>({...toRow(games[0]),id:i+1}));let requests=0;
 const client={from:()=>({select:()=>({order:()=>({range:async(start,end)=>{requests++;return {data:rows.slice(start,end+1)};}})})})};
 assert.equal((await gameService(client).getGames()).length,1201);assert.equal(requests,3);
});
