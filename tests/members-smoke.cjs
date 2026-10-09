const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||undefined,headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
 if(process.env.TEST_THEME==='light')await page.addInitScript(()=>localStorage.setItem('shiyams-theme','light'));
  const site=process.env.SITE_URL||'http://127.0.0.1:4175/shiyamsGamesList',id='00000000-0000-0000-0000-000000000042';
  const user={id,aud:'authenticated',role:'authenticated',email:'collector@example.test',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
  const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),token=b64({alg:'HS256'})+'.'+b64({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})+'.test';
  const session={access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,user};
  let profile={id,display_name:'Player One',bio:'My adventures begin here.',avatar_id:0,is_active:true},collection=[],signup=0,imports=0,admin=false;
  const {toRow}=await import('../lib/game-data.mjs');
  const catalog=[toRow({id:1,title:'Owner Original',year:'2020',genres:['RPG'],status:'loved',description:'Original game'},true),toRow({id:2,title:'Shared Adventure',year:'2024',genres:['Action'],status:'unplayed',rawgId:77},true),toRow({id:3,title:'RAWG Adventure',year:'2026',genres:['Action'],status:'unplayed',rawgId:88},true)];
  await page.route('**/*.supabase.co/**',async route=>{
   const req=route.request(),url=new URL(req.url()),method=req.method(),body=req.postData()?JSON.parse(req.postData()):{};
   const respond=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(method==='OPTIONS')return respond({});
   if(url.pathname.endsWith('/signup')){signup++;return respond(session);}
   if(url.pathname.endsWith('/token'))return respond(session);
   if(url.pathname.endsWith('/user'))return respond(user);
   if(url.pathname.endsWith('/logout'))return respond({});
   if(url.pathname.endsWith('/member_profiles'))return respond(profile);
   if(url.pathname.endsWith('/admin_profiles'))return respond(admin?{id,role:'admin',is_active:true}:null);
   if(url.pathname.endsWith('/collection_entries'))return respond(collection.map(e=>({status:e.status,games:catalog.find(g=>g.id===e.id)})));
   if(url.pathname.endsWith('/games'))return respond(url.searchParams.has('is_featured')?[catalog[0]]:catalog);
   if(url.pathname.includes('/rpc/')){
    if(url.pathname.endsWith('/add_collection_game')&&!collection.some(g=>g.id===body.selected_game))collection.push({id:body.selected_game,status:'unplayed'});
    if(url.pathname.endsWith('/set_collection_status'))collection.find(g=>g.id===body.selected_game).status=body.new_status;
    if(url.pathname.endsWith('/remove_collection_game'))collection=collection.filter(g=>g.id!==body.selected_game);
    if(url.pathname.endsWith('/update_member_profile'))profile={...profile,display_name:body.new_name,bio:body.new_bio,avatar_id:body.new_avatar};
    return respond(null);
   }
   if(url.pathname.endsWith('/member-api')){
    if(body.action==='search')return respond({catalog:[{id:2,title:'Shared Adventure',release_year:2024,rawg_id:77}],suggestions:[{rawgId:88,title:'RAWG Adventure',year:2026}]});
    if(body.action==='import'){imports++;const gid=catalog.find(g=>g.rawg_id===body.rawgId)?.id||3;if(!collection.some(g=>g.id===gid))collection.push({id:gid,status:'unplayed'});return respond({gameId:gid});}
   }
   if(url.pathname.endsWith('/gaming-radar'))return respond({items:[{id:88,title:'RAWG Adventure',url:'https://rawg.io/games/example',image:'',releaseDate:new Date().toISOString().slice(0,10),metacritic:90,interest:500,platforms:['PC'],players:1000}],total:1,updatedAt:new Date().toISOString(),nextPage:null});
   return respond({});
  });
  await page.goto(site+'/');await page.locator('#grid .card').waitFor();assert.equal(await page.locator('#grid .card').count(),1);
  await page.getByRole('link',{name:'Sign in / Join',exact:true}).click();await page.locator('[data-mode=register]').click();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'auth overflow '+width);}
  await page.screenshot({path:'/private/tmp/member-register.png',fullPage:true});
  await page.locator('[name=email]').fill('bad');await page.locator('[name=password]').fill('test-password-123');await page.locator('#member-auth button').click();assert.equal(signup,0);
  await page.locator('[name=email]').fill(user.email);await page.locator('#member-auth button').click();await page.locator('#member-profile').waitFor();assert.equal(signup,1);assert.equal(await page.locator('.member-welcome .member-links').count(),0);assert.equal(await page.locator('#account-app>header .member-signout').count(),1);
  const savedTheme=await page.locator('html').getAttribute('data-theme');
  for(const theme of ['dark','light']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   for(const width of [390,1440]){
    await page.setViewportSize({width,height:1000});
    const boxes=await page.locator('#account-app>header .member-icon-control,#account-app>header .avatar-link').evaluateAll(es=>es.map(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height,y:r.y+r.height/2};}).filter(r=>r.w));
    assert.ok(boxes.length>=2);assert.ok(boxes.every(r=>r.w===42&&r.h===42&&Math.abs(r.y-boxes[0].y)<1),'header circles align '+theme+' '+width);
   }
  }
  await page.evaluate(t=>document.documentElement.dataset.theme=t,savedTheme);
  assert.equal(await page.locator('.avatar-choice').count(),110);assert.equal(await page.locator('input[type=file]').count(),0);
  await page.getByRole('tab',{name:'Anime',exact:false}).click();assert.equal(await page.locator('#avatar-panel-anime .avatar-choice').count(),30);
  await page.locator('[name=avatar_id][value="107"]').check();
  await page.getByRole('tab',{name:'Superhero',exact:false}).click();assert.equal(await page.locator('#avatar-panel-superhero .avatar-choice').count(),30);
  await page.locator('[name=avatar_id][value="109"]').check();await page.getByRole('button',{name:'Save profile',exact:true}).click();await page.getByText(/Profile saved/).waitFor();assert.equal(profile.avatar_id,109);
  await page.reload();await page.locator('#member-profile').waitFor();assert.equal(await page.getByRole('tab',{name:'Superhero',exact:false}).getAttribute('aria-selected'),'true');assert.ok(await page.locator('[name=avatar_id][value="109"]').isChecked());
  await page.getByRole('tab',{name:'Game',exact:false}).click();assert.ok(await page.locator('[name=avatar_id][value="109"]').isChecked());
  await page.getByRole('tab',{name:'Game',exact:false}).press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'Anime',exact:false}).getAttribute('aria-selected'),'true');
  await page.getByRole('tab',{name:'Anime',exact:false}).press('Home');assert.equal(await page.getByRole('tab',{name:'Game',exact:false}).getAttribute('aria-selected'),'true');


  await page.locator('#member-search').fill('Adventure');await page.locator('[data-catalog="2"]').click();await page.getByText('Added. Game details are maintained by administrators.').waitFor();assert.equal(collection.length,1);
  await page.locator('[data-import="88"]').click();await page.waitForFunction(()=>document.querySelector('#personal-count').textContent==='2');assert.equal(collection.length,2);
  await page.locator('[data-member-status="2"]').selectOption('playing');await page.getByText('Collection status saved.').waitFor();assert.equal(catalog[1].status,'unplayed');
  await page.locator('[name=display_name]').fill('New Collector');await page.locator('[name=bio]').fill('My story <script>alert(1)</script>');await page.locator('[name=avatar_id][value="49"]').check();await page.getByRole('button',{name:'Save profile',exact:true}).click();await page.getByText(/Profile saved/).waitFor();assert.equal(profile.avatar_id,49);
  for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'account overflow '+width);
   const spacing=await page.evaluate(()=>{const root=document.querySelector('#account-app'),footer=root.querySelector('footer'),last=root.querySelector('main').lastElementChild;return {gap:footer.getBoundingClientRect().top-last.getBoundingClientRect().bottom,tail:document.documentElement.scrollHeight-(footer.getBoundingClientRect().bottom+scrollY)};});
   assert.ok(spacing.gap>=0&&spacing.gap<=24,'account content/footer gap '+width);assert.ok(spacing.tail<3,'space after footer '+width);
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight-(document.querySelector('#account-app>footer').getBoundingClientRect().bottom+scrollY)<3),'extra space after footer');
  await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  assert.ok(await page.evaluate(()=>Math.abs(document.querySelector('#account-app>footer').getBoundingClientRect().bottom-innerHeight)<3),'scroll ends at account footer');
  // Positioned decoration must never enlarge the page beyond its footer.
  await page.evaluate(()=>{const probe=document.createElement('div');probe.id='overflow-probe';probe.style.cssText='position:absolute;top:100%;height:600px;width:1px;pointer-events:none';document.querySelector('#account-app').append(probe);});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight-(document.querySelector('#account-app>footer').getBoundingClientRect().bottom+scrollY)<3),'account clips decorative overflow');
  await page.locator('#overflow-probe').evaluate(el=>el.remove());
  await page.screenshot({path:'/private/tmp/member-account.png',fullPage:true});
  await page.goto(site+'/');await page.locator('#grid .card').first().waitFor();assert.equal(await page.locator('#grid .card').count(),2);assert.equal(await page.locator('#grid').getByText('Owner Original').count(),0);assert.ok((await page.locator('#about').textContent()).includes('New Collector'));assert.equal(await page.locator('#about script').count(),0);
  for(const path of ['/top250','/calendar']){await page.goto(site+path);await page.locator('[data-add-rawg]').click();await page.getByRole('button',{name:'In your collection',exact:true}).waitFor();assert.equal(collection.length,2);}
  await page.goto(site+'/radar');await page.locator('[data-find-game]').click();await page.waitForURL('**/account?search=*');await page.locator('[data-import="88"]').waitFor();assert.equal(await page.locator('[data-import="88"]').isDisabled(),true);
  await page.goto(site+'/radar');await page.locator('[data-kind=anticipated]').click();await page.locator('[data-add-rawg]').click();await page.getByRole('button',{name:'In your collection',exact:true}).waitFor();
  await page.goto(site+'/account');await page.locator('[data-member-remove="3"]').click();await page.waitForFunction(()=>document.querySelector('#personal-count').textContent==='1');
  profile.is_active=false;await page.goto(site+'/account');await page.getByRole('heading',{name:'Account unavailable'}).waitFor();assert.equal(await page.locator('#member-search').count(),0);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(site+'/');await page.locator('#grid .card').first().waitFor();assert.equal(await page.locator('#grid .card').count(),1);
  await page.goto(site+'/top250');await page.locator('.radar-card').waitFor();assert.equal(await page.locator('[data-add-rawg]').count(),0);
  assert.ok(imports>=4);assert.deepEqual(errors,[]);
  console.log('PASS: immediate signup, private landing collection, catalog/RAWG additions, duplicate-safe UI, personal statuses, profile/avatar edits, mobile layouts, discovery additions, removal, blocking and guest fallback.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
