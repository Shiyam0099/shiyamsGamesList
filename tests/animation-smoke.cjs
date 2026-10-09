const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true});
 try{
  const {toRow}=await import('../lib/game-data.mjs'),fixture={window:{}};
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../games.js'),'utf8'),fixture);
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/rest/v1/games**',r=>r.fulfill({json:fixture.window.GAMES.map(g=>toRow({...g,poster:'https://animation-art.example/cover'},true))}));
  await page.route('**/functions/v1/gaming-radar**',r=>r.fulfill({json:{items:Array.from({length:10},(_,i)=>({id:i+1,title:'Motion Game '+(i+1),image:'https://animation-art.example/'+i,url:'https://rawg.io/games/test',releaseDate:new Date().getUTCFullYear()+'-12-31',interest:100-i,platforms:['PC']}))}}));
  await page.route('https://animation-art.example/**',async r=>{
   const id=r.request().url().split('/').pop();
   if(id==='7')await new Promise(resolve=>setTimeout(resolve,1400));
   if(id==='8')return r.abort();
   const portrait=id==='4';
   await r.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${portrait?900:1600}" height="${portrait?1600:900}"><defs><linearGradient id="g"><stop stop-color="#537544"/><stop offset="1" stop-color="#15282e"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`});
  });
  await page.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({contentType:'text/html',body:'Trailer fixture'}));
  const base=process.env.SITE_URL||'http://127.0.0.1:4176/shiyamsGamesList';
  for(const [theme,width] of [['dark',1440],['light',390]]){
   await page.addInitScript(value=>{localStorage.setItem('shiyams-theme',value);localStorage.setItem('shiyams-theme-sound','off');},theme);
   await page.setViewportSize({width,height:1000});await page.goto(base+'/');
   await page.locator('.hero-scene.is-active img').waitFor();
   const duration=await page.evaluate(async()=>{
    const start=performance.now();document.querySelectorAll('.hero-chapter')[7].click();
    await new Promise(resolve=>{function check(){if(document.querySelector('.hero-copy h1').textContent.includes('Motion Game 8'))resolve();else requestAnimationFrame(check);}check();});
    return performance.now()-start;
   });
   assert.ok(duration<650,`slow artwork must not delay selection (${theme}: ${duration}ms)`);
   await page.waitForFunction(()=>document.querySelector('.hero-scene.is-active img')?.src.endsWith('/7'));
   await page.evaluate(()=>{document.querySelectorAll('.hero-chapter')[8].click();document.querySelectorAll('.hero-chapter')[4].click();});
   await page.waitForFunction(()=>document.querySelector('.hero-copy h1').textContent.includes('Motion Game 5'));
   await page.waitForFunction(()=>document.querySelector('.hero-scene.is-active img')?.dataset.orientation==='portrait');
   assert.ok(await page.locator('.hero-scene.is-active img').evaluate(img=>img.getAnimations().filter(a=>a.animationName?.startsWith('hero-pan')).every(a=>a.effect.getKeyframes().every(f=>!('objectPosition' in f)))),'hero pan uses transform only');
   for(const progress of [0,.5,1]){
    assert.ok(await page.locator('.hero-scene.is-active img').evaluate((img,p)=>{const pan=img.getAnimations().find(a=>a.animationName?.startsWith('hero-pan'));pan.pause();pan.currentTime=9000*p;const box=img.getBoundingClientRect(),root=img.closest('.hero-scene').getBoundingClientRect();return box.left<=root.left+1&&box.right>=root.right-1&&box.top<=root.top+1&&box.bottom>=root.bottom-1;},progress),'pan never reveals an empty edge');
   }
   await page.locator('#dashboard').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('.is-counting'));
   assert.ok(await page.evaluate(()=>[...document.querySelectorAll('#stats .stat')].every(el=>el.getAnimations().length===0)),'stats do not stack card reveals on their section reveal');
   assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.count-ticker')].every(el=>getComputedStyle(el).position==='absolute'&&el.getAnimations().length===0)),'counters update outside normal layout without duplicate movement');
   assert.ok(await page.evaluate(()=>document.querySelector('#dashboard').getAnimations({subtree:true}).every(a=>a.effect.getKeyframes().every(f=>!('filter' in f)))),'summary reveal has no animated blur');
   await page.waitForFunction(()=>!document.querySelector('.is-counting'));
   assert.equal(await page.locator('#stats .stat strong').first().textContent(),String(fixture.window.GAMES.length));
   await page.locator('#personal-save-file').scrollIntoViewIfNeeded();
   await page.locator('#dashboard').scrollIntoViewIfNeeded();
   assert.equal(await page.locator('.is-counting').count(),0,'scrolling back does not restart settled counters');
   await page.locator('#next-rec').click();
   assert.ok(await page.locator('#next-rec .ui-icon').evaluate(el=>el.getAnimations().length>0),'spin icon animates immediately');
   await page.locator('#collection').scrollIntoViewIfNeeded();
   await page.evaluate(()=>{for(const id of ['loved','unplayed','dropped','all'])document.querySelector('#tab-'+id).click();});
   assert.ok(await page.locator('#grid').evaluate(el=>el.getAnimations({subtree:true}).some(a=>a.effect.getTiming().duration===1000)),'collection tabs use the slower one-second reveal');
   await page.waitForTimeout(1200);
   assert.equal(await page.locator('#tab-all').getAttribute('aria-selected'),'true');
   assert.equal(await page.locator('#grid .card').count(),fixture.window.GAMES.length);
   const alignment=await page.evaluate(()=>{const a=document.querySelector('#tab-all').getBoundingClientRect(),b=document.querySelector('.tab-indicator').getBoundingClientRect();return Math.abs(a.left-b.left)<1&&Math.abs(a.width-b.width)<1;});assert.ok(alignment,'tab indicator aligns after rapid switches');
   await page.locator('#grid .cover-button').first().click();await page.waitForFunction(()=>document.querySelector('#game-dialog').open);await page.keyboard.press('Escape');
   // Re-entry replays each section once, including the collection heading and profile.
   for(const selector of ['#personal-save-file','#stats','.dashboard-panel','#currently-playing','#recommendations','#collection>.section-heading','#about']){
    const section=page.locator(selector).first();
    for(let visit=0;visit<2;visit++){
     await section.evaluate(el=>{const y=el.getBoundingClientRect().top+scrollY;scrollTo({top:y>innerHeight+150?0:document.documentElement.scrollHeight,behavior:'instant'});});
     await page.waitForTimeout(80);
     await section.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
     await page.waitForFunction(s=>document.querySelector(s).getAnimations().some(a=>a.effect.getTiming().duration===1000),selector);
     await page.waitForTimeout(1150);
     assert.equal(await section.evaluate(el=>el.getAnimations().length),0,`${selector} settles without looping`);
    }
   }
   assert.equal(await page.locator('.is-counting').count(),0,'repeat section reveals do not restart counters');
   await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#tab-loved').click();
   assert.equal(await page.locator('#grid').evaluate(el=>el.getAnimations({subtree:true}).length),0,'reduced motion stops collection animations');
   await page.locator('#next-rec').click();assert.equal(await page.locator('#recommendations').evaluate(el=>el.getAnimations({subtree:true}).length),0,'reduced motion stops spin animations');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.emulateMedia({reducedMotion:'no-preference'});
   console.log(`PASS ${theme} ${width}px: slow-art selection ${Math.round(duration)}ms, pan coverage, section/counter reveals, spin, rapid tabs, dialog, reduced motion.`);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
