const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.sectionReveals=[];const animate=Element.prototype.animate;
   Element.prototype.animate=function(frames,options){if(options?.duration===1000&&frames[0]?.opacity===.22)sectionReveals.push({element:this,frames,time:performance.now(),rect:this.getBoundingClientRect().toJSON()});return animate.call(this,frames,options);};
  });
  await page.route('**/rest/v1/games**',r=>r.fulfill({json:[]}));
  await page.route('**/functions/v1/gaming-radar**',r=>r.fulfill({json:{items:Array.from({length:24},(_,i)=>({id:i+1,title:'Discovery Game '+(i+1),url:'https://rawg.io/games/example-'+i,releaseDate:new Date().getUTCFullYear()+'-12-31',metacritic:90,players:1000,interest:100,platforms:['PC']})),total:24,nextPage:null,updatedAt:new Date().toISOString()}}));
  await page.route('**/functions/v1/gaming-feed**',r=>r.fulfill({json:{items:Array.from({length:14},(_,i)=>({id:String(i),title:'Gaming headline '+i,url:'https://www.gamespot.com/articles/story-'+i,excerpt:'News from across the gaming world.',source:'GameSpot',publishedAt:new Date().toISOString(),kind:new URL(r.request().url()).searchParams.get('kind')})),updatedAt:new Date().toISOString()}}));
  const base=process.env.SITE_URL||'http://127.0.0.1:4176/shiyamsGamesList';
  for(const [theme,width] of [['dark',1440],['light',390]]){
   await page.addInitScript(theme=>localStorage.setItem('shiyams-theme',theme),theme);
   await page.setViewportSize({width,height:1000});
   for(const route of ['radar','top250','calendar','news','reviews']){
    await page.goto(base+'/'+route,{waitUntil:'domcontentloaded'});
    const app=page.locator('#radar-app,#library-app,#editorial-app');
    await app.locator('.radar-card,.article-card').first().waitFor();
    await page.waitForFunction(()=>sectionReveals.some(r=>r.element.matches('.editorial-intro')));
    const cards=app.locator('.radar-card,.article-card'),card=cards.nth(8);
    await card.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
    await page.waitForFunction(()=>sectionReveals.some(r=>r.element.matches('.radar-card,.article-card')&&r.rect.top<innerHeight&&r.rect.bottom>0));
    await page.waitForTimeout(1100);
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(100);
    const before=await card.evaluate(el=>sectionReveals.filter(r=>r.element===el).length);
    await card.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
    await page.waitForFunction(({selector,index,before})=>sectionReveals.filter(r=>r.element===document.querySelectorAll(selector)[index]).length>before,{selector:`#${await app.getAttribute('id')} .${route==='news'||route==='reviews'?'article-card':'radar-card'}`,index:8,before});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>[...document.querySelectorAll('.radar-card,.article-card')].every(el=>el.getAnimations().length===0),null,{timeout:1000});
    const logo=app.locator('header .brand');assert.equal(new URL(await logo.getAttribute('href'),base).href,base+'/');
    await logo.click();await page.waitForURL(base+'/');
    await page.emulateMedia({reducedMotion:'no-preference'});
    console.log(`PASS ${route} ${theme}: visible entry, repeat reveal, reduced motion, logo navigates home.`);
   }
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
