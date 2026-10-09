const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const context={window:{}};require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname,'../games.js'),'utf8'),context);
 const {toRow}=await import('../lib/game-data.mjs');
 await page.route('**/rest/v1/games**',r=>r.fulfill({json:context.window.GAMES.map(g=>toRow(g,true))}));
 await page.route('**/functions/v1/**',r=>r.fulfill({json:{items:r.request().url().includes('kind=anticipated')?[{id:1,title:'Future Adventure',releaseDate:new Date().getUTCFullYear()+'-12-31',interest:10},{id:2,title:'Next World',releaseDate:new Date().getUTCFullYear()+'-12-31',interest:9}]:[],updatedAt:new Date().toISOString()}}));
 const base=(process.env.SITE_URL||'http://127.0.0.1:4176/shiyamsGamesList').replace(/\/$/,'');
 await page.goto(base+'/');await page.locator('#grid .card').first().waitFor();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.getByRole('button',{name:'Switch to light mode',exact:true}).click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 assert.equal(await page.evaluate(()=>localStorage.getItem('shiyams-theme')),'light');
 await page.locator('.hero-chapter.is-current').waitFor();
 const marker=await page.locator('.hero-chapter.is-current .hero-chapter-line').evaluate(el=>({background:getComputedStyle(el).backgroundColor,shadow:getComputedStyle(el).boxShadow}));
 assert.notEqual(marker.shadow,'none');assert.notEqual(marker.background,'rgba(0, 0, 0, 0)');
 assert.equal(await page.locator('.orbit-core .ui-icon').first().evaluate(el=>getComputedStyle(el).color),'rgb(65, 108, 78)');
 assert.equal(await page.locator('header .theme-toggle').count(),0);
 assert.equal(await page.locator('body>.floating-theme-toggle').count(),1);
 assert.equal(await page.locator('.floating-theme-toggle').evaluate(el=>getComputedStyle(el).position),'fixed');

 const filterStyle=selector=>page.locator(selector).evaluate(el=>{const s=getComputedStyle(el);return [s.backgroundColor,s.borderRadius,s.height,s.fontSize,s.boxShadow];});
 assert.deepEqual(await filterStyle('#collection-genre-toggle'),await filterStyle('#sort'));
 await page.locator('#sort').click();assert.equal(await page.locator('#sort').evaluate(el=>getComputedStyle(el).borderColor),'rgb(165, 180, 155)');await page.keyboard.press('Escape');
 assert.equal(await page.locator('#about p:not(.eyebrow)').first().evaluate(el=>getComputedStyle(el).color),'rgb(82, 97, 83)');
 assert.equal(await page.locator('#playing-games .playing-card').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(238, 241, 235)');
 await page.locator('#grid .cover-button').first().click();await page.locator('#game-dialog').waitFor();
 assert.equal(await page.locator('#dialog-description').evaluate(el=>getComputedStyle(el).color),'rgb(77, 96, 82)');await page.keyboard.press('Escape');
 // Verify the startup canvas even when application JavaScript never arrives.
 const boot=await browser.newPage();await boot.addInitScript(()=>localStorage.setItem('shiyams-theme','light'));
 await boot.route('**/assets/*.js',r=>r.abort());await boot.goto(base+'/radar',{waitUntil:'domcontentloaded'});
 assert.equal(await boot.locator('#load-state').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(238, 241, 235)');await boot.close();
 await page.locator('#dashboard').scrollIntoViewIfNeeded();await page.screenshot({path:'/private/tmp/theme-home.png'});
 await page.reload();await page.locator('#grid .card').first().waitFor();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 for(const route of ['account','radar','top250','calendar','news','reviews','admin']){
  await page.goto(base+'/'+route);await page.getByRole('button',{name:'Switch to dark mode',exact:true}).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
  for(const width of [390,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+route+' '+width);const rect=await page.locator('.floating-theme-toggle').boundingBox();assert.ok(rect.x+rect.width<=width&&rect.y>=0&&rect.y+rect.height<=1000);assert.equal(await page.locator('.theme-toggle').count(),1);}
  if(route==='account'||route==='admin')await page.screenshot({path:'/private/tmp/theme-'+route+'.png'});
 }
 await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Switch to light mode',exact:true}).waitFor();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.emulateMedia({reducedMotion:'no-preference'});
 for(const target of ['light','dark']){
  await page.locator('.theme-toggle').click();
  await page.waitForFunction(()=>document.getAnimations().some(a=>a.effect?.pseudoElement==='::view-transition-new(root)'));
  const timing=await page.evaluate(()=>document.getAnimations().find(a=>a.effect?.pseudoElement==='::view-transition-new(root)').effect.getTiming());
  assert.equal(timing.duration,1500);assert.equal(timing.easing,'linear');
  assert.equal(await page.locator('html').getAttribute('data-theme'),target);
  assert.equal(await page.locator('.theme-toggle').getAttribute('data-mode'),target);
  assert.equal(await page.locator('.theme-toggle').getAttribute('aria-label'),'Switch to '+(target==='light'?'dark':'light')+' mode');
  assert.equal(await page.locator('.theme-toggle').evaluate(el=>getComputedStyle(el).viewTransitionName),'theme-control');

  assert.ok(await page.locator('html').evaluate(el=>el.classList.contains('theme-smoke')));
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.documentElement,'::view-transition-new(root)').maskImage),'none');
  if(process.env.CAPTURE_THEME){
   await page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.pseudoElement?.includes('view-transition')).forEach(a=>{a.pause();a.currentTime=300;}));
   await page.screenshot({path:'/private/tmp/theme-smoke-'+target+'.png'});
   await page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.pseudoElement?.includes('view-transition')).forEach(a=>a.play()));
  }


  await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-transition'));
  assert.equal(await page.locator('.theme-toggle').getAttribute('aria-busy'),null);
  const thumb=await page.locator('.theme-switch-thumb').evaluate(el=>({height:el.getBoundingClientRect().height,y:new DOMMatrix(getComputedStyle(el).transform).m42}));
  assert.ok(Math.abs(thumb.y-(target==='light'?thumb.height:0))<1,'switch settles at correct end');

 }
 // Raw pointer clicks do not wait for Playwright's actionability checks.
 const toggleBox=await page.locator('.theme-toggle').boundingBox();
 const clickToggle=()=>page.mouse.click(toggleBox.x+toggleBox.width/2,toggleBox.y+toggleBox.height/2);
 await clickToggle();
 await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
 await page.waitForFunction(()=>document.getAnimations().some(a=>a.effect?.pseudoElement==='::view-transition-new(root)'));
 await clickToggle();
 await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark',{},{timeout:1200});
 await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-transition'));
 assert.equal(await page.evaluate(()=>localStorage.getItem('shiyams-theme')),'dark');
 // Several requests during snapshot setup must settle on the latest choice.
 await page.evaluate(()=>{const b=document.querySelector('.theme-toggle');for(let i=0;i<5;i++)b.click();});
 await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
 await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-transition'));
 assert.equal(await page.locator('.theme-toggle').getAttribute('data-mode'),'light');
 assert.equal(await page.locator('.theme-toggle').getAttribute('aria-busy'),null);
 await page.locator('.theme-toggle').click();
 await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
 await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-transition'));
 // Changing motion preferences during the reveal settles the final theme.
 await page.locator('.theme-toggle').click();await page.waitForFunction(()=>document.documentElement.classList.contains('theme-transition'));
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.documentElement.classList.contains('theme-transition'));
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 // Older browsers still switch and persist without the snapshot API.
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>document.startViewTransition=undefined);
 await page.locator('.theme-toggle').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('theme-transition')),false);
 const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'no-preference'});
 await touch.goto(base+'/admin',{waitUntil:'domcontentloaded'});
 const touchControl=touch.locator('.theme-toggle');await touchControl.waitFor();
 const touchBox=await touchControl.boundingBox();
 const tapToggle=()=>touch.touchscreen.tap(touchBox.x+touchBox.width/2,touchBox.y+touchBox.height/2);
 await tapToggle();await touch.waitForFunction(()=>document.documentElement.dataset.theme==='light');
 await touch.waitForFunction(()=>document.getAnimations().some(a=>a.effect?.pseudoElement==='::view-transition-new(root)'));
 await tapToggle();await touch.waitForFunction(()=>document.documentElement.dataset.theme==='dark',{},{timeout:1200});
 await touch.waitForFunction(()=>!document.documentElement.classList.contains('theme-transition'));await touch.close();
 assert.deepEqual(errors,[]);console.log('PASS: dark default, light/dark toggle, saved choice after reload and across all routes, mobile layout.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
