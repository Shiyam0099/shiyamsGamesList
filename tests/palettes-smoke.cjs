const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true});
 try{
  const {toRow}=await import('../lib/game-data.mjs'),fixture={window:{}};
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../games.js'),'utf8'),fixture);
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  let palettes={dark_theme:'original',light_theme:'sage'},offline=false;
  await context.route('**/rest/v1/site_theme_settings**',r=>offline?r.abort():r.fulfill({json:palettes}));
  await context.route('**/rest/v1/games**',r=>r.fulfill({json:fixture.window.GAMES.map(g=>toRow({...g,poster:'https://palette-art.example/cover.svg'},true))}));
  await context.route('https://palette-art.example/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><defs><linearGradient id="g"><stop stop-color="#3d4352"/><stop offset="1" stop-color="#172326"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>'}));
  await context.route('**/functions/v1/**',r=>r.fulfill({json:{items:[{id:1,title:'Palette Adventure',image:'https://palette-art.example/hero.svg',releaseDate:new Date().getUTCFullYear()+'-12-31',interest:100}],updatedAt:new Date().toISOString()}}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=(process.env.SITE_URL||'http://127.0.0.1:4177/shiyamsGamesList').replace(/\/$/,'');
  const colors=new Map();
  const audit=label=>require('./palette-audit.cjs')(page,label);
  for(const [mode,id] of [['dark','original'],['dark','crimson'],['dark','neon-blue'],['light','sage'],['light','gold'],['light','purple']]){
   palettes={...palettes,[mode+'_theme']:id};
   await page.goto(base+'/');await page.locator('#grid .card').first().waitFor();
   await page.waitForFunction(p=>document.documentElement.dataset.darkPalette===p.dark_theme&&document.documentElement.dataset.lightPalette===p.light_theme,palettes);
   if(await page.locator('html').getAttribute('data-theme')!==mode)await page.locator('.theme-toggle').click();
   const styles=await page.evaluate(()=>{
    const color=s=>getComputedStyle(document.querySelector(s)).color;
    return {ink:color('#personal-save-file h2'),accent:color('#personal-save-file .lime'),loader:color('.orbit-core .ui-icon'),logo:getComputedStyle(document.querySelector('.brand-emblem [fill="#cefa69"]')).fill,button:color('#next-rec'),buttonBg:getComputedStyle(document.querySelector('#next-rec')).backgroundImage,filter:getComputedStyle(document.querySelector('#sort')).backgroundColor};
   });
   colors.set(id,styles);
   if(!['original','sage'].includes(id))await audit(id+' home');
   if(!['original','sage'].includes(id)){
    assert.notEqual(styles.accent,colors.get(mode==='dark'?'original':'sage').accent,id+' changes title accents');
    assert.notEqual(styles.logo,colors.get(mode==='dark'?'original':'sage').logo,id+' changes the logo');
    assert.notEqual(styles.loader,colors.get(mode==='dark'?'original':'sage').loader,id+' changes loaders');
    assert.match(await page.locator('link[rel=icon]').getAttribute('href'),/^data:image\/svg\+xml/,id+' favicon matches');
   }
   for(const width of [390,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id+' overflow '+width);}
   await page.locator('#recommendations').scrollIntoViewIfNeeded();
   const brackets=await page.locator('.rec-lock').evaluate(el=>{const s=getComputedStyle(el);return {repeat:s.backgroundRepeat,size:s.backgroundSize,filter:s.filter};});
   assert.ok(brackets.repeat.split(',').every(value=>value.trim()==='no-repeat'),id+' spin corners never tile');
   assert.equal(brackets.size.split(',').length,8,id+' has eight corner strokes');
   assert.equal(brackets.filter,'none',id+' bracket color is not rotated twice');
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.locator('#next-rec').click();
   await page.waitForFunction(()=>document.querySelector('.rec-lock').getAnimations().length>0);
   await page.locator('#recommendations').evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=650;}));
   await page.locator('#recommendations').screenshot({path:'/private/tmp/palette-spin-'+id+'.png'});
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.locator('#recommendations').screenshot({path:'/private/tmp/palette-'+id+'.png'});
   if(!['original','sage'].includes(id)){
    await page.locator('#grid .card [data-game]').first().click();
    await page.waitForFunction(()=>document.querySelector('#game-dialog').open);
    await audit(id+' details');
    await page.screenshot({path:'/private/tmp/palette-details-'+id+'.png'});
    await page.locator('[data-detail-media=critic]').click();
    await audit(id+' critic');
    await page.keyboard.press('Escape');
   }
   if(!['original','sage'].includes(id)){
    await page.locator('#collection-genre-toggle').click();await audit(id+' genre dropdown');
    await page.keyboard.press('Escape');
    for(const target of ['#next-rec','#rec-trailer','#sort','.member-account-link']){
     await page.locator(target).hover();await audit(id+' hover '+target);
    }
   }
   if(mode==='light'){
    await page.locator('#about').scrollIntoViewIfNeeded();
    await page.locator('.collection-shortcut').waitFor();
    await require('./icon-contrast.cjs')(page,id+' collection shortcut','.collection-shortcut');
    await page.locator('.collection-shortcut').click();
    await page.waitForFunction(()=>document.querySelector('#collection-title').getBoundingClientRect().top>=0);
   }
   for(const route of ['radar','top250','calendar','news','reviews','account']){
    await page.goto(base+'/'+route);await page.locator('.theme-toggle').waitFor();
    if(!['original','sage'].includes(id))await audit(id+' '+route);
    assert.equal(await page.locator('html').getAttribute('data-theme'),mode);
    assert.equal(await page.locator('html').getAttribute('data-'+mode+'-palette'),id);
   }
  }
  // Cached palettes keep first paint correct without JS or a network response.
  await page.evaluate(()=>{localStorage.setItem('shiyams-theme','dark');localStorage.setItem('shiyams-site-palettes-v1',JSON.stringify({dark_theme:'crimson',light_theme:'gold'}));});
  const boot=await context.newPage();await boot.route('**/assets/*.js',r=>r.abort());await boot.goto(base+'/radar',{waitUntil:'domcontentloaded'});
  assert.equal(await boot.locator('html').getAttribute('data-dark-palette'),'crimson');
  assert.equal(await boot.locator('#load-state').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(9, 3, 4)');await boot.close();
  offline=true;await page.goto(base+'/');await page.locator('#grid .card').first().waitFor();assert.equal(await page.locator('html').getAttribute('data-dark-palette'),'crimson');
  assert.deepEqual(errors,[]);
  console.log('PASS: all six palettes, logos/favicon, loader accents, desktop/mobile, route persistence, cached startup and offline fallback.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
