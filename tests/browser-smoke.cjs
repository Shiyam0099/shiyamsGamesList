const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const screenshotDir = process.env.SCREENSHOT_DIR || os.tmpdir();
const siteURL = process.env.SITE_URL || 'http://127.0.0.1:4174';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || undefined, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const context={window:{}};require('node:vm').runInNewContext(require('node:fs').readFileSync(path.join(__dirname,'../games.js'),'utf8'),context);
  const {toRow}=await import('../lib/game-data.mjs');
  let fixtureGames=JSON.parse(JSON.stringify(context.window.GAMES));
  await page.route('**/rest/v1/games**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(fixtureGames.map(g=>toRow(g,true)))}));
  await page.addInitScript(games=>{window.__TEST_GAMES=games;},fixtureGames);
  // Isolate app behavior from third-party media availability during functional checks.
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body>Trailer embed test</body></html>' }));
  await page.goto(siteURL.endsWith('/')?siteURL:siteURL+'/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#grid .card');
  assert.equal(await page.locator('#grid .card').count(), 105);
  assert.equal(await page.locator('#stats .stat strong').allTextContents().then(a=>a.join(',')), '163,105,30,26');
  assert.equal(await page.locator('.rate-tried strong').textContent(), '34.4%');
  assert.equal(await page.locator('.playing-card').count(), 2);
  await page.locator('#playing-games [data-game="19"]').click();
  assert.match(await page.getByRole('link', {name:/Torrent for/}).getAttribute('href'), /1337x\.to\/torrent\/3760788\//);
  await page.keyboard.press('Escape');
  await page.locator('#playing-games [data-game="41"]').click();
  assert.ok(await page.getByRole('button', {name:'Torrent',exact:true}).isDisabled());
  await page.keyboard.press('Escape');
  await page.selectOption('#sort', 'title');
  const titles = await page.locator('#grid h3').allTextContents();
  assert.deepEqual(titles, titles.slice().sort((a,b)=>a.localeCompare(b)));
  await page.selectOption('#sort', 'newest');
  assert.match(await page.locator('#grid .card-meta').first().textContent(), /^2027/);
  await page.selectOption('#sort', 'oldest');
  assert.match(await page.locator('#grid .card-meta').first().textContent(), /^2014/);
  await page.fill('#search', 'BLOODBORNE');
  assert.equal(await page.locator('#grid .card').count(), 1);
  await page.fill('#search', 'nonexistent-game');
  assert.equal(await page.locator('#grid .card').count(), 0);
  await page.click('#clear-search');
  await page.selectOption('#genre', 'FPS');
  assert.ok((await page.locator('#grid .card-meta').allTextContents()).every(t=>t.includes('FPS')));
  await page.selectOption('#genre', '');
  await page.click('#tab-loved'); assert.equal(await page.locator('#grid .card').count(), 30);
  await page.keyboard.press('ArrowRight'); assert.equal(await page.locator('#grid .card').count(), 26);
  await page.keyboard.press('Home'); assert.equal(await page.locator('#grid .card').count(), 163);
  assert.equal(await page.locator('#tab-all span').textContent(), '163');
  assert.equal(await page.locator('#result-count').textContent(), '163 of 163 games');
  assert.equal(await page.locator('#grid').getAttribute('aria-labelledby'), 'tab-all');
  assert.equal(await page.locator('#grid [data-game="19"]').count(), 1);
  assert.equal(await page.locator('#grid [data-game="41"]').count(), 1);
  await page.fill('#search', 'Evil West');
  assert.equal(await page.locator('#grid .card').count(), 1);
  await page.fill('#search', '');
  await page.selectOption('#genre', 'FPS');
  assert.deepEqual(
    await page.locator('#grid [data-game]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.game)).sort((a,b)=>a-b)),
    await page.evaluate(() => window.__TEST_GAMES.filter(game => game.genres.includes('FPS')).map(game => game.id).sort((a,b)=>a-b)),
  );
  await page.selectOption('#genre', '');
  await page.selectOption('#sort', 'title');
  const allTitles = await page.locator('#grid h3').allTextContents();
  assert.deepEqual(allTitles, allTitles.slice().sort((a,b)=>a.localeCompare(b)));
  await page.selectOption('#sort', 'oldest');
  await page.click('#tab-unplayed');
  for (let bucket = 0; bucket < 5; bucket++) {
    await page.fill('#search', 'old search should be cleared');
    const row = page.locator(`[data-age="${bucket}"]`);
    await row.focus();
    await page.keyboard.press('Enter');
    const expected = await page.evaluate(bucket => window.__TEST_GAMES.filter(game => {
      if (game.status !== 'unplayed') return false;
      const year = Number(game.year), now = new Date().getFullYear(), age = now - year;
      const group = game.future || !Number.isFinite(year) || year > now ? 4
        : age < 2 ? 0 : age < 5 ? 1 : age < 10 ? 2 : 3;
      return group === bucket;
    }).map(game => game.id).sort((a,b)=>a-b), bucket);
    assert.deepEqual(await page.locator('#grid [data-game]').evaluateAll(nodes => nodes.map(n=>Number(n.dataset.game)).sort((a,b)=>a-b)), expected);
    assert.equal(await page.locator('#result-count').textContent(), `${expected.length} of ${expected.length} games`);
    assert.equal(await row.getAttribute('aria-pressed'), 'true');
    assert.ok(await page.locator('#age-filter').isVisible());
    assert.equal(await page.inputValue('#search'), '');
  }
  await page.fill('#search', 'no matching game');
  assert.equal(await page.locator('#grid .card').count(), 0);
  await page.click('#clear-search');
  assert.ok(await page.locator('#age-filter').isHidden());
  assert.equal(await page.locator('#grid .card').count(), 105);
  await page.locator('[data-age="0"]').click();
  await page.click('#clear-age');
  assert.equal(await page.locator('#grid .card').count(), 105);
  await page.locator('[data-age="0"]').click();
  await page.click('#tab-all');
  assert.ok(await page.locator('#age-filter').isHidden());
  assert.equal(await page.locator('#grid .card').count(), 163);
  await page.click('#tab-unplayed');
  for (const mode of ['random', 'rated', 'newest', 'oldest', 'genre', 'surprise', 'taste']) {
    await page.selectOption('#rec-mode', mode);
    if (mode === 'genre') await page.selectOption('#rec-genre', 'Action RPG');
    const before = await page.locator('#rec-info h3').textContent();
    assert.notEqual(before, 'A little pause.');
    await page.click('#next-rec');
    assert.equal(await page.inputValue('#rec-mode'), mode);
    const after = await page.locator('#rec-info h3').textContent();
    if (!['rated'].includes(mode)) assert.notEqual(before, after, mode);
  }
  await page.selectOption('#rec-mode', 'genre'); await page.selectOption('#rec-genre', 'Football');
  assert.match(await page.locator('#rec-info').textContent(), /No unplayed games found in this genre/);
  assert.equal(await page.locator('#rec-trailer').isDisabled(), true);
  await page.selectOption('#rec-mode', 'random');
  await page.evaluate(() => { window.previousArtwork = document.querySelector('#rec-image'); });
  await page.click('#next-rec');
  assert.ok(await page.evaluate(() => window.previousArtwork !== document.querySelector('#rec-image')), 'new picks replace stale artwork');
  await page.click('#grid [data-game="4"]');
  assert.equal(await page.locator('#game-dialog').evaluate(d=>d.open), true);
  assert.equal(await page.locator('#dialog-title').textContent(), 'Bloodborne');
  assert.match(await page.locator('#dialog-rating').textContent(), /92/);
  assert.ok(await page.locator('#dialog-description').textContent());
  assert.match(await page.locator('#video-slot iframe').getAttribute('src'), /youtube-nocookie/);
  assert.ok(await page.locator('#dialog-links').getByText('View Critic Reviews').isVisible());
  assert.doesNotMatch(await page.locator('#game-dialog').textContent(), /Open trailer on YouTube|Artwork source|Playing a video connects|Trailer: /i);
  assert.ok(await page.getByRole('button', {name:'Torrent',exact:true}).isDisabled());
  await page.keyboard.press('Escape'); await page.locator('#video-slot iframe').waitFor({state:'detached'}); assert.equal(await page.locator('#video-slot iframe').count(), 0);
  await page.evaluate(() => window.scrollTo(0,0));
  await page.screenshot({ path: path.join(screenshotDir, 'shiyams-desktop.png'), fullPage: false });
  for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth), `page overflow ${width}`);
    await page.click('#rec-trailer');
    assert.ok(await page.locator('#game-dialog').evaluate(d=>d.scrollWidth <= d.clientWidth), `modal overflow ${width}`);
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({ path: path.join(screenshotDir, 'shiyams-mobile.png'), fullPage: true });
  const g = (id, extra={}) => ({id,title:`Fixture Game ${id}`,year:'2020',genres:['RPG'],status:'unplayed',future:false,poster:'',videoId:'',description:'',metacritic:null,downloadLink:'',...extra});
  async function fixture(games) {
    fixtureGames=games;
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForSelector('#public-app:not([hidden])');
  }
  for (const size of [0, 1, 3]) {
    await fixture(Array.from({length:size},(_,i)=>g(i,{status:'playing'})));
    assert.equal(await page.locator('.playing-card').count(),size);
    assert.equal(await page.locator('#rec-trailer').isDisabled(),true);
    assert.doesNotMatch(await page.locator('#rates').textContent(),/NaN|Infinity/);
    if (size) {await page.locator('.playing-card').first().click();assert.equal(await page.locator('#dialog-title').textContent(),'Fixture Game 0');await page.keyboard.press('Escape');}
  }
  await fixture([g(1,{title:'A very long game title '.repeat(12),metacritic:94,description:'A short test description.',downloadLink:'https://example.com/download',ratingUrl:'https://example.com/reviews'})]);
  await page.click('#rec-trailer');
  assert.ok(await page.locator('#game-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth));
  const torrent = page.getByRole('link',{name:/Torrent for/});
  assert.equal(await torrent.getAttribute('target'),'_blank');
  assert.equal(await torrent.getAttribute('rel'),'noopener noreferrer');
  await page.context().route('https://example.com/**',route=>route.fulfill({body:'Test destination'}));
  const popupPromise=page.waitForEvent('popup');await torrent.click();const popup=await popupPromise;await popup.waitForLoadState();
  assert.equal(popup.url(),'https://example.com/download');assert.equal(await popup.evaluate(()=>window.opener),null);await popup.close();
  await page.keyboard.press('Escape');
  for (const mode of ['random','rated','newest','oldest','genre','surprise','taste']) {
    await page.selectOption('#rec-mode',mode);await page.click('#next-rec');assert.match(await page.locator('#rec-info h3').textContent(),/very long/);
  }
  await fixture([g(1,{'Download Link':'https://example.com/legacy'})]);
  await page.click('#rec-trailer');assert.equal(await page.getByRole('link',{name:/Torrent for/}).getAttribute('href'),'https://example.com/legacy');
  await fixture([g(1,{downloadLink:'javascript:alert(1)'})]);
  await page.click('#rec-trailer');assert.equal(await page.getByRole('link',{name:/Torrent for/}).count(),0);assert.ok(await page.getByRole('button',{name:'Torrent',exact:true}).isDisabled());
  assert.match(await page.locator('#dialog-rating').textContent(),/N\/A/);
  assert.ok(await page.locator('#dialog-description').isHidden());assert.ok(await page.locator('#video-slot').isHidden());
  await page.keyboard.press('Escape');
  await page.selectOption('#rec-mode','rated');
  assert.match(await page.locator('#rec-info').textContent(), /No rated unplayed games/);
  await fixture([g(1,{metacritic:83,metacriticSource:'https://example.com/critic-source'})]);
  await page.click('#rec-trailer');
  assert.equal(await page.getByRole('link',{name:'View Critic Reviews'}).getAttribute('href'),'https://example.com/critic-source');
  await page.keyboard.press('Escape');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.selectOption('#rec-mode','random');
  await page.click('#next-rec');
  assert.equal(await page.locator('#rec-info').evaluate(el=>el.getAnimations().length),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: real collection, all 7 recommendation modes, filters, sorting, keyboard tabs, dialogs, stats, 7 viewport sizes, active counts 0/1/3, empty and singleton libraries, missing metadata, safe new-tab downloads and legacy field. No page errors.');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
