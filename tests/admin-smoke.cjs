const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const {toRow}=await import('../lib/game-data.mjs');
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE || undefined,headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const site=process.env.SITE_URL || 'http://127.0.0.1:4174';
 const adminId='00000000-0000-0000-0000-000000000001',otherId='00000000-0000-0000-0000-000000000002';
 let role='admin',active=true,failGames=false,functionsCalls=0;
 let games=[toRow({id:1,title:'First Game',year:'2020',genres:['RPG'],status:'playing',videoId:'',description:'First description'},true),toRow({id:2,title:'Second Game',year:'2023',genres:['Action'],status:'unplayed'},true)];
 let profile={id:adminId,email:'admin@example.test',username:'Curator',role,is_active:true};
 let users=[];
 const user={id:adminId,aud:'authenticated',role:'authenticated',email:profile.email,app_metadata:{provider:'email'},user_metadata:{},created_at:new Date().toISOString()};
 const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const token=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:adminId,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})+'.test-signature';
 await page.route('**/*.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method(),body=req.postData()?JSON.parse(req.postData()):{};
  const respond=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(method==='OPTIONS')return respond({});
  if(url.pathname.endsWith('/token')){
   if(body.password==='wrong-password')return respond({error:'invalid_grant',error_description:'Invalid login credentials'},400);
   return respond({access_token:token,refresh_token:'mock-refresh-token',token_type:'bearer',expires_in:3600,user});
  }
  if(url.pathname.endsWith('/user'))return respond(user);
  if(url.pathname.endsWith('/logout'))return respond({});
  if(url.pathname.includes('/rest/v1/admin_profiles')){
   profile={...profile,role,is_active:active};
   return respond(url.searchParams.has('id')?profile:[profile,...users]);
  }
  if(url.pathname.includes('/rest/v1/activity_log'))return respond([]);
  if(url.pathname.includes('/rpc/')){
   if(url.pathname.endsWith('/set_currently_playing')){games=games.map(g=>({...g,status:body.game_ids.includes(g.id)?'playing':g.status==='playing'?'unplayed':g.status}));}
   if(url.pathname.endsWith('/update_my_username'))profile.username=body.new_username;
   if(url.pathname.endsWith('/manage_admin_profile'))users=users.map(u=>u.id===body.target_id?{...u,username:body.new_username,is_active:body.active}:u);
   return respond(null);
  }
  if(url.pathname.includes('/functions/v1/')){
   functionsCalls++;
   if(body.action==='create')users.push({id:otherId,email:body.email,username:body.username,role:'admin',is_active:true});
   if(body.action==='delete')users=users.filter(u=>u.id!==body.userId);
   return respond({success:true});
  }
  if(url.pathname==='/rest/v1/games'){
   if(failGames)return respond({message:'private internal error must not be rendered'},500);
   const id=Number(url.searchParams.get('id')?.replace('eq.',''));
   const single=req.headers().accept?.includes('vnd.pgrst.object');
   if(method==='GET')return respond(id?games.find(g=>g.id===id):games);
   if(method==='POST'){const added={...body,id:Math.max(...games.map(g=>g.id))+1};games.push(added);return respond(added);}
   if(method==='PATCH'){games=games.map(g=>g.id===id?{...g,...body}:g);return respond(single?games.find(g=>g.id===id):[games.find(g=>g.id===id)]);}
   if(method==='DELETE'){games=games.filter(g=>g.id!==id);return respond({id});}
  }
  return respond({});
 });
 await page.goto(site+'/admin/games');await page.waitForURL('**/admin/login');
 await page.locator('[name=email]').fill(profile.email);await page.locator('[name=password]').fill('wrong-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByText('Unable to sign in. Check your email and password.').waitFor();
 await page.locator('[name=password]').fill('test-password-123');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('heading',{name:'Overview',exact:true}).waitFor();
 assert.equal(await page.getByRole('link',{name:'Admin users',exact:true}).count(),0);
 await page.goto(site+'/admin/users');await page.getByText('Only the Super Admin can manage administrator accounts.').waitFor();assert.equal(functionsCalls,0);
 await page.getByRole('link',{name:'Games',exact:true}).click();await page.getByRole('heading',{name:'First Game'}).waitFor();
 await page.locator('#game-search').fill('Second');assert.equal(await page.locator('.admin-row').count(),1);await page.locator('#game-search').fill('');
 await page.locator('[data-status-id="2"]').selectOption('loved');await page.getByText('Status updated.').waitFor();assert.equal(games[1].status,'loved');
 await page.getByRole('link',{name:'Add game',exact:true}).click();await page.locator('[name=title]').fill('New Game');await page.locator('#genres-toggle').click();await page.locator('#genre-search').fill('RPG');await page.locator('#genre-options input[value="RPG"]').check();await page.locator('#genre-search').fill('Puzzle');await page.locator('#genre-options input[value="Puzzle"]').check();await page.locator('#genre-search').fill('Custom Genre');await page.locator('.genre-add').click();await page.getByRole('button',{name:'Remove Custom Genre',exact:true}).click();await page.keyboard.press('Escape');await page.locator('[name=year]').fill('2024');await page.locator('textarea[name=description]').fill('A new adventure.');await page.locator('[name=metacritic]').fill('91');await page.locator('[name=criticVideoUrl]').fill('https://www.youtube.com/watch?v=abcdefghijk');
 await page.getByRole('button',{name:'Add game',exact:true}).click();await page.waitForURL('**/admin/games/3/edit');await page.getByText('Game added successfully.').waitFor();assert.deepEqual(games.find(g=>g.id===3).genres,['RPG','Puzzle']);assert.equal(await page.locator('.genre-chip').count(),2);await page.locator('#genres-toggle').click();await page.locator('#genre-search').fill('RPG');assert.ok(await page.locator('#genre-options input[value="RPG"]').isChecked());await page.keyboard.press('Escape');
 await page.locator('[name=title]').fill('Edited Game');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByText('Game saved.').waitFor();assert.equal(games.find(g=>g.id===3).title,'Edited Game');
 await page.getByRole('link',{name:'Currently playing',exact:true}).click();await page.locator('#playing-list').waitFor();await page.locator('#playing-list input[value="2"]').check();await page.locator('#playing-search').fill('First');await page.getByRole('button',{name:'Save selection'}).click();await page.getByText('Currently playing selection saved.').waitFor();assert.equal(games.filter(g=>g.status==='playing').length,2);
 await page.getByRole('link',{name:'Games',exact:true}).click();await page.locator('[data-delete="3"]').click();await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(games.length,3);await page.locator('[data-delete="3"]').click();await page.locator('[data-confirm]').click();await page.getByText('Game deleted.').waitFor();assert.equal(games.length,2);
 await page.getByRole('link',{name:'Settings',exact:true}).click();await page.locator('#username-form [name=username]').fill('New Curator');await page.getByRole('button',{name:'Save username'}).click();await page.getByText('Username saved.',{exact:false}).waitFor();assert.equal(profile.username,'New Curator');
 await page.locator('[name=current]').fill('test-password-123');await page.locator('#password-form [name=password]').fill('different-password');await page.locator('[name=confirm]').fill('does-not-match');await page.getByRole('button',{name:'Change password',exact:true}).click();await page.getByText('New passwords do not match.').waitFor();await page.locator('[name=confirm]').fill('different-password');await page.getByRole('button',{name:'Change password',exact:true}).click();await page.getByText('Password changed successfully.').waitFor();
 role='super_admin';await page.goto(site+'/admin/users');await page.getByRole('heading',{name:'Add admin'}).waitFor();
 await page.locator('#create-admin [name=username]').fill('Second Admin');await page.locator('#create-admin [name=email]').fill('second@example.test');await page.locator('#create-admin [name=password]').fill('temporary-password');await page.getByRole('button',{name:'Create admin'}).click();await page.getByRole('heading',{name:'Second Admin'}).waitFor();assert.equal(users.length,1);
 const userForm=page.locator(`[data-user="${otherId}"]`);await userForm.locator('[name=active]').uncheck();await userForm.getByRole('button',{name:'Save',exact:true}).click();await page.getByText('Inactive admin', {exact:true}).waitFor();assert.equal(users[0].is_active,false);
 assert.equal(await page.locator(`[data-user="${adminId}"] [data-remove-user]`).count(),0);
 await page.locator(`[data-remove-user="${otherId}"]`).click();await page.locator('[data-confirm]').click();await page.getByText('Admin deleted.',{exact:true}).waitFor();assert.equal(users.length,0);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`users overflow ${width}`);}
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(require('node:os').tmpdir(),'shiyams-admin-users.png')});
 await page.getByRole('link',{name:'Games',exact:true}).click();await page.locator('#admin-games').waitFor();await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(require('node:os').tmpdir(),'shiyams-admin-mobile.png'),fullPage:true});
 failGames=true;await page.getByRole('link',{name:'Overview',exact:true}).click();await page.getByRole('heading',{name:'Unable to load this page'}).waitFor();assert.doesNotMatch(await page.locator('body').textContent(),/private internal/);failGames=false;await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByRole('heading',{name:'Overview',exact:true}).waitFor();
 role='admin';active=false;await page.goto(site+'/admin/games');await page.waitForURL('**/admin/login');assert.equal(await page.locator('.admin-row').count(),0);
 await page.locator('[name=email]').fill(profile.email);await page.locator('[name=password]').fill('test-password-123');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByText('This account is not an active administrator. Contact the Super Admin.').waitFor();
 active=true;await page.locator('[name=password]').fill('test-password-123');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL('**/admin/login');await page.goto(site+'/admin/settings');await page.waitForURL('**/admin/login');
 assert.deepEqual(errors,[]);
 console.log('PASS: admin route guards, login/logout, CRUD, status, multi-selection, settings, Super Admin user management, deactivation, errors and responsive layouts. API mocked; PostgreSQL authorization tested separately.');
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
