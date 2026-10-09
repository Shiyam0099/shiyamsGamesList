const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true});try{
 const {toRow}=await import('../lib/game-data.mjs');
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.players=[];window.blockAutoplay=false;
  window.YT={Player:class{
   constructor(frame,options){this.frame=frame;this.options=options;this.destroyed=false;players.push(this);queueMicrotask(()=>options.events.onReady({target:this}));}
   mute(){this.muted=true;}unMute(){this.muted=false;}
   playVideo(){if(blockAutoplay)this.options.events.onAutoplayBlocked();else this.options.events.onStateChange({data:1,target:this});}
   pauseVideo(){this.options.events.onStateChange({data:2,target:this});}
   destroy(){this.destroyed=true;this.frame.remove();}
  }};
 });
 const games=[{id:1,title:'Crimson Frontier',videoId:'abcdefghijk',criticVideoUrl:'https://www.youtube.com/watch?v=lmnopqrstuv',poster:'https://detail-art.example/red.svg',description:'A world at the edge of the known sky. Find your own path through its forgotten cities.',metacritic:91,ratingUrl:'https://www.metacritic.com/game/example/'},{id:2,title:'Midnight Archive',poster:'https://detail-art.example/blue.svg',description:''},{id:3,title:'The Unwritten World',poster:'https://detail-art.example/broken.svg',videoId:'bad',criticVideoUrl:'https://example.com/review'}].map(g=>({year:'2026',genres:['Action','RPG'],status:'unplayed',...g}));
 await page.route('**/rest/v1/games**',r=>r.fulfill({json:games.map(g=>toRow(g,true))}));
 await page.route('**/functions/v1/gaming-radar**',r=>r.fulfill({json:{items:[]}}));
 await page.route('https://detail-art.example/**',r=>r.request().url().endsWith('broken.svg')?r.abort():r.fulfill({headers:{'Access-Control-Allow-Origin':'*'},contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="100%" height="100%" fill="${r.request().url().includes('red')?'#a63333':'#3344a6'}"/></svg>`}));
 await page.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({contentType:'text/html',body:'<body style="background:#172725;color:#d0ddc7;display:grid;place-items:center;height:90vh;font:24px sans-serif">Video preview</body>'}));
 const base=process.env.SITE_URL||'http://127.0.0.1:4176/shiyamsGamesList';await page.goto(base+'/');await page.locator('#grid .card').first().waitFor();
 const open=async id=>{await page.locator(`#grid [data-game="${id}"]`).click();await page.waitForFunction(()=>document.querySelector('#game-dialog').open);};
 await open(1);await page.waitForFunction(()=>players.length&&players.at(-1).muted);
 assert.match(await page.locator('#video-slot iframe').getAttribute('src'),/autoplay=1&mute=1/);
 assert.equal(new URL(await page.locator('#video-slot iframe').getAttribute('src')).searchParams.get('controls'),'0','ambient preview uses the popup controls');
 await page.waitForFunction(()=>document.querySelector('#game-dialog').style.getPropertyValue('--art-accent')!=='206 250 105');
 const red=await page.locator('#game-dialog').evaluate(el=>el.style.getPropertyValue('--art-accent'));
 await page.locator('#detail-sound').click();assert.equal(await page.evaluate(()=>players.at(-1).muted),false);
 await page.locator('#detail-play').click();assert.match(await page.locator('#detail-media-status').textContent(),/Paused/);
 await page.locator('[data-detail-media=critic]').click();await page.waitForFunction(()=>players.length===2);
 assert.ok(await page.evaluate(()=>players[0].destroyed));assert.match(await page.locator('#video-slot iframe').getAttribute('src'),/lmnopqrstuv/);
 await page.evaluate(()=>players.at(-1).options.events.onError({data:101}));
 await page.getByText('The screen is taking a break.',{exact:true}).waitFor();assert.equal(await page.locator('#video-slot iframe').count(),0);
 await page.locator('#detail-play').click();await page.waitForFunction(()=>players.length===3);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>players.every(p=>p.destroyed));
 await open(2);await page.getByText('A world worth imagining.',{exact:true}).waitFor();assert.ok(await page.locator('#detail-play').isDisabled());
 await page.waitForFunction(red=>document.querySelector('#game-dialog').style.getPropertyValue('--art-accent')!==red&&document.querySelector('#game-dialog').style.getPropertyValue('--art-accent')!=='206 250 105',red);
 await page.locator('[data-detail-media=critic]').click();await page.getByText('Your verdict comes first.',{exact:true}).waitFor();assert.match(await page.locator('#detail-external').getAttribute('href'),/results\?search_query=/);assert.match(await page.locator('#dialog-description').textContent(),/chapter/);
 for(const theme of ['dark','light']){
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  assert.equal(await page.locator('#detail-fallback-title').evaluate(el=>getComputedStyle(el).color),'rgb(240, 244, 233)','fallback title stays readable over the dark artwork in both themes');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});const overflow=await page.locator('#game-dialog').evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth,nodes:[...el.querySelectorAll('*')].filter(n=>n.getBoundingClientRect().right>el.getBoundingClientRect().right+1).map(n=>[n.tagName,n.id,n.className,n.getBoundingClientRect().width]).slice(0,12)}));assert.ok(overflow.scroll<=overflow.width+1,`${theme} popup overflow at ${width}: ${JSON.stringify(overflow)}`);}
  await page.locator('#game-dialog').evaluate(el=>el.scrollTop=0);await page.screenshot({path:`/private/tmp/game-details-${theme}.png`});
 }
 await page.keyboard.press('Escape');await open(3);await page.waitForFunction(()=>document.querySelector('#detail-backdrop').complete);assert.ok(await page.locator('#detail-backdrop').evaluate(el=>el.naturalWidth>0));await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});const count=await page.evaluate(()=>players.length);await open(1);assert.equal(await page.locator('#video-slot iframe').count(),0);assert.equal(await page.evaluate(()=>players.length),count);
 await page.locator('#detail-play').click();await page.waitForFunction(n=>players.length===n+1,count);await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>blockAutoplay=true);await open(1);await page.getByText('Press play to start trailer',{exact:true}).waitFor();await page.evaluate(()=>blockAutoplay=false);await page.locator('#detail-play').click();await page.getByText('Trailer · Playing silently',{exact:true}).waitFor();
 await page.keyboard.press('Escape');await page.evaluate(()=>{delete window.YT;});await page.route('https://www.youtube.com/iframe_api',r=>r.abort());await open(1);await page.getByText('The screen is taking a break.',{exact:true}).waitFor();await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);console.log('PASS: muted trailer, critic switching, no overlap, pause/sound, unavailable/blocked/missing media, missing artwork, per-artwork colors, light/dark responsive layout, reduced motion, close cleanup. YouTube events mocked.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
