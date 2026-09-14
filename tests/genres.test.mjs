import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeGenres,genreCatalogue} from '../lib/genres.mjs';
test('canonical genres unify spelling and preserve compound genre meaning',()=>{
 assert.deepEqual(normalizeGenres(['open-world','Open World','open-word RPG','Open-world Action RPG']),['Open World','RPG','Action RPG']);
 assert.deepEqual(normalizeGenres(['Action-adventure','action adventure','Hack-and-slash','First Person Shooter','FPS','Brawler']),['Action Adventure','Hack and Slash','FPS','Beat ’em Up']);
 assert.deepEqual(normalizeGenres(['Roguelite','Roguelike','RPG','Action RPG']),['Roguelite','Roguelike','RPG','Action RPG']);
 assert.deepEqual(normalizeGenres(['  custom-genre  ','CUSTOM GENRE']),['Custom Genre']);
 const all=normalizeGenres([...genreCatalogue,'Action platformer','open-world RPG']);assert.deepEqual(normalizeGenres(all),all);
});
