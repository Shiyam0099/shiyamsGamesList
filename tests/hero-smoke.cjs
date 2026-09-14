const{chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true});const p=await b.newPage({viewport:{width:1440,height:1100}});const errors=[];p.on('pageerror',e=>errors.push(e.message));let fail=false,empty=false;
const now=new Date(),year=now.getUTCFullYear(),date=year+'-12-31';const items=Array.from({length:12},(_,i)=>({id:i+1,title:i===0?'The Most Anticipated Adventure With an Extraordinarily Long Title':'Upcoming World '+(i+1),image:'https://hero-art.example/'+i+'.svg',url:'https://rawg.io/games/example-'+i,releaseDate:date,interest:100-i,platforms:['PC','PlayStation','Xbox']}));
await p.route('https://hero-art.example/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#334a39"/></svg>'}));
await p.route('**/functions/v1/gaming-radar**',r=>r.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify({items:empty?[]:items,updatedAt:new Date().toISOString()})}));
await p.goto('http://127.0.0.1:4175/shiyamsGamesList/',{waitUntil:'domcontentloaded'});await p.locator('.hero-chapter').first().waitFor();assert.equal(await p.locator('.hero-chapter').count(),10);assert.equal(await p.locator('#cinematic-hero + section').getAttribute('id'),'personal-save-file');assert.deepEqual(await p.locator('#public-app>main>section').evaluateAll(es=>es.slice(0,6).map(e=>e.id)),['cinematic-hero','personal-save-file','dashboard','currently-playing','recommendations','collection']);
await p.waitForFunction(()=>document.querySelectorAll('.hero-chapter')[1]?.getAttribute('aria-pressed')==='true',{},{timeout:7000});
assert.ok(await p.locator('.hero-scene:not(.is-active) img').evaluate(el=>el.getAnimations().some(a=>a.animationName==='hero-drift'&&a.playState==='running')),'outgoing artwork continues drifting during the fade');
await p.locator('.hero-chapter').nth(4).click();await p.getByRole('heading',{name:'Upcoming World 5.'}).waitFor();assert.equal(await p.locator('.hero-pause').getAttribute('aria-pressed'),'true');await p.locator('.hero-chapter').nth(0).click();
await p.evaluate(()=>document.fonts.ready);
for(const width of [320,390,768,1024,1440]){
 await p.setViewportSize({width,height:844});
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const heights=[];
 // Sample every animation frame as well as every game, including the long-title fixture.
 await p.evaluate(()=>{window.heroHeights=[];window.trackHeroHeight=true;function sample(){window.heroHeights.push(document.querySelector('#cinematic-hero').getBoundingClientRect().height);if(window.trackHeroHeight)requestAnimationFrame(sample);}sample();});
 for(let i=0;i<10;i++){
  await p.locator('.hero-chapter').nth(i).click();
  await p.waitForFunction(i=>document.querySelectorAll('.hero-chapter')[i].getAttribute('aria-pressed')==='true',i);
  heights.push(await p.locator('#cinematic-hero').evaluate(e=>e.getBoundingClientRect().height));
  assert.ok(await p.evaluate(()=>{const stage=document.querySelector('.hero-stage').getBoundingClientRect(),copy=document.querySelector('.hero-copy').getBoundingClientRect();return copy.top>=stage.top&&copy.bottom<=stage.bottom;}),'copy fits '+width);
 }
 const frames=await p.evaluate(()=>{window.trackHeroHeight=false;return window.heroHeights;});
 assert.ok(Math.max(...heights,...frames)-Math.min(...heights,...frames)<1,'hero height changes at '+width);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);
 assert.ok(await p.locator('#personal-save-file .intro-note').isVisible(),'intro note on '+width);
 assert.equal(await p.locator('#personal-save-file a').getAttribute('href'),'#collection');
}
await p.locator('#personal-save-file a').click();assert.equal(new URL(p.url()).hash,'#collection');
await p.emulateMedia({reducedMotion:'reduce'});await p.reload();await p.locator('.hero-chapter').first().waitFor();assert.equal(await p.locator('.hero-pause').getAttribute('aria-pressed'),'true');assert.ok(!(await p.locator('#cinematic-hero').getAttribute('class')).includes('hero-running'));
empty=true;await p.reload();await p.getByText('No upcoming releases are listed for the rest of this year yet. Discover your next adventure below.').waitFor();assert.ok(await p.locator('#next-rec').isVisible());fail=true;await p.reload();await p.getByRole('button',{name:'Try again',exact:true}).waitFor();empty=false;fail=false;await p.getByRole('button',{name:'Try again',exact:true}).click();await p.locator('.hero-chapter').first().waitFor();assert.deepEqual(errors,[]);console.log('PASS hero: top 10, section order, selection, pause, reduced motion, stable height across all ten games and animation frames at five screen sizes, restored intro, empty/error/retry.');await b.close();})().catch(e=>{console.error(e);process.exit(1)});
