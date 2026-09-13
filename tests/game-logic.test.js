const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { statistics, createRecommender, rating, releaseYear, safeURL } = require('../game-logic');
const game = (id, values = {}) => ({ id, title: `Game ${id}`, status: 'unplayed',
  year: '2020', genres: ['Action'], future: false, metacritic: null, ...values });
const fixture = [game(1, { metacritic: 94 }), game(2, { metacritic: 94 }),
  game(3, { year: '2010', genres: ['RPG'], metacritic: 80 }),
  game(4, { year: '2027', future: true }), game(5, { year: 'TBA', future: true }),
  game(6, { genres: ['Expansion'] }), game(7, { status: 'loved' }),
  game(8, { status: 'dropped' }), game(9, { status: 'playing' })];

test('statistics count distinct statuses and keep tried separate from playing', () => {
  const s = statistics(fixture, 2026);
  assert.deepEqual(s.counts, { unplayed: 6, loved: 1, dropped: 1, playing: 1, other: 0 });
  assert.equal(s.rates.tried, 2 / 9 * 100);
  assert.equal(s.rates.played, 1 / 9 * 100);
  assert.equal(s.rates.dropped, 1 / 9 * 100);
  assert.ok(Math.abs(s.rates.tried + s.rates.backlog + s.rates.playing - 100) < 1e-10);
  assert.equal(s.ages.reduce((sum, b) => sum + b.count, 0), 6);
});
test('age boundaries never overlap; future and unknown years are separate', () => {
  const ages = ['2026', '2025', '2024', '2022', '2021', '2017', '2016', '2027', 'TBA'];
  assert.deepEqual(statistics(ages.map((year, id) => game(id, { year })), 2026).ages.map(b => b.count), [2, 2, 2, 1, 2]);
  assert.deepEqual(statistics([game(1, { year: '2024' })], 2025).ages.map(b => b.count), [1, 0, 0, 0, 0]);
  assert.deepEqual(statistics([game(1, { year: '2024' })], 2026).ages.map(b => b.count), [0, 1, 0, 0, 0]);
});
test('empty libraries have finite zero rates and no picks in every mode', () => {
  assert.ok(Object.values(statistics([]).rates).every(n => n === 0));
  for (const mode of ['random', 'rated', 'newest', 'oldest', 'genre', 'surprise', 'taste']) {
    assert.equal(createRecommender([]).pick({ mode }).game, null);
    assert.equal(createRecommender([game(1, { status: 'loved' })]).pick({ mode }).game, null);
  }
});
test('all modes respect eligibility, with only newest including dated watchlist', () => {
  const r = createRecommender(fixture, 2026);
  assert.deepEqual(r.pool('random').map(g => g.id), [1, 2, 3]);
  assert.deepEqual(r.pool('newest').map(g => g.id), [4]);
  assert.deepEqual(r.pool('oldest').map(g => g.id), [3]);
  assert.deepEqual(r.pool('rated').map(g => g.id), [1, 2]);
  assert.deepEqual(r.pool('genre', 'RPG').map(g => g.id), [3]);
  assert.equal(r.pick({ mode: 'genre', genre: 'Horror' }).game, null);
});
test('ties randomize and previous games are avoided without weakening extrema', () => {
  const r = createRecommender(fixture, 2026);
  assert.equal(r.pick({ mode: 'rated', random: () => 0 }).game.id, 1);
  assert.equal(r.pick({ mode: 'rated', random: () => .99 }).game.id, 2);
  assert.equal(r.pick({ mode: 'rated', previous: fixture[0], random: () => 0 }).game.id, 2);
  assert.equal(r.pick({ mode: 'oldest', previous: fixture[2] }).game.id, 3);
  for (const mode of ['newest', 'oldest']) {
    const ties = createRecommender([game(1), game(2)], 2026);
    assert.equal(ties.pick({ mode, random: () => 0 }).game.id, 1);
    assert.equal(ties.pick({ mode, random: () => .99 }).game.id, 2);
  }
});
test('surprise switches genres and visits every candidate before restarting', () => {
  const r = createRecommender(fixture, 2026);
  const surprise = r.pick({ mode: 'surprise', previous: fixture[0], random: () => 0 });
  assert.equal(surprise.game.id, 3);
  for (const mode of ['surprise', 'taste']) {
    let previous = null, seen = [], ids = [];
    for (let i = 0; i < r.eligible.length; i++) {
      const result = r.pick({ mode, previous, seen, random: () => 0 });
      ids.push(result.game.id); previous = result.game; seen = result.seen;
    }
    assert.equal(new Set(ids).size, r.eligible.length);
    assert.notEqual(r.pick({ mode, previous, seen }).game.id, previous.id);
  }
});
test('single candidates remain usable in all modes', () => {
  const only = game(1, { metacritic: 80 });
  const r = createRecommender([only], 2026);
  for (const mode of ['random', 'rated', 'newest', 'oldest', 'genre', 'surprise', 'taste']) {
    assert.equal(r.pick({ mode, genre: 'Action', previous: only, seen: [1] }).game.id, 1);
  }
});
test('unknown or invalid scores are never treated as zero-rated games', () => {
  for (const metacritic of [null, undefined, '', '94', NaN, Infinity, -1, 101]) {
    assert.equal(rating({ metacritic }), null);
  }
  assert.equal(rating({ metacritic: 0 }), 0);
  assert.equal(rating({ metacritic: 94 }), 94);
  assert.equal(createRecommender([game(1)]).pick({ mode: 'rated' }).game, null);
  assert.equal(releaseYear({ year: 'TBA' }), null);
});
test('external links permit web URLs and reject executable or malformed inputs', () => {
  assert.equal(safeURL('https://example.com/download'), 'https://example.com/download');
  for (const url of ['', null, 'javascript:alert(1)', 'data:text/html,test', '//example.com', '/test', 'https://user:pass@example.com']) {
    assert.equal(safeURL(url), null);
  }
});
test('real data preserves every game and has editable metadata fields', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../games.js'), 'utf8'), context);
  const games = context.window.GAMES;
  assert.ok(games.length > 0);
  assert.equal(new Set(games.map(g => g.id)).size, games.length);
  for (const g of games) {
    assert.ok(['unplayed', 'loved', 'dropped', 'playing'].includes(g.status));
    assert.ok(Array.isArray(g.genres) && g.genres.length);
    assert.equal(typeof g.description, 'string');
    assert.ok(g.metacritic === null || rating(g) !== null);
    assert.equal(typeof g.downloadLink, 'string');
    assert.ok(!g.downloadLink || safeURL(g.downloadLink));
  }
});
