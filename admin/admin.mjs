import {genrePickerHTML,bindGenrePicker} from './genre-picker.mjs';
import {loader,brand,icon} from '../lib/ui.mjs';
import './admin.css';
import {localPath,sitePath,normalizeLinks} from '../lib/routes.mjs';
import {gameService,statuses,friendlyError,validateGame} from '../lib/game-data.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=(values,selected)=>Object.entries(values).map(([v,label])=>`<option value="${escape(v)}" ${v===selected?'selected':''}>${escape(label)}</option>`).join('');
const field=(name,label,value='',type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" value="${escape(value)}" ${extra}></label>`;
const notice='<p class="admin-notice" role="status" aria-live="polite"></p>';
export async function startAdmin(client){
 const root=document.querySelector('#admin-app'),service=gameService(client);
 let profile,routeVersion=0,flash='';
 const $=selector=>root.querySelector(selector);
 const navigate=path=>{history.pushState({},'',sitePath(localPath(path)));render();};
 root.addEventListener('click',event=>{const a=event.target.closest('a[data-route]');if(a && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button===0){event.preventDefault();navigate(a.getAttribute('href'));}});
 window.addEventListener('popstate',render);
 const message=(text,error=false,scope=root)=>{const el=scope.querySelector('.admin-notice');if(el){el.textContent=text;el.classList.toggle('error',error);el.setAttribute('role',error?'alert':'status');}};
 const busy=async(form,action,success)=>{if(form.dataset.busy)return;form.dataset.busy='true';const buttons=[...form.querySelectorAll('button')].filter(b=>!b.disabled);buttons.forEach(b=>b.disabled=true);message('Saving…',false,form);const controls=[...form.querySelectorAll('input,select,textarea')].filter(el=>!el.disabled);try{const operation=action();controls.forEach(el=>el.disabled=true);await operation;if(success)message(success,false,form);}catch(error){message(error.userMessage || friendlyError(error),true,form);}finally{delete form.dataset.busy;buttons.forEach(b=>b.disabled=false);controls.forEach(el=>el.disabled=false);}};
 const rpc=async(name,args)=>{const {error}=await client.rpc(name,args);if(error)throw error;};
 const check=result=>{if(result.error)throw result.error;return result.data;};
 async function guard(){
  const {data:{session},error}=await client.auth.getSession();if(error || !session)return null;
  const {data:{user},error:userError}=await client.auth.getUser();if(userError || !user)return null;
  const result=await client.from('admin_profiles').select('*').eq('id',user.id).maybeSingle();
  if(result.error)throw result.error;
  return result.data?.is_active ? result.data : null;
 }
 function shell(title){
  root.innerHTML=`<div class="admin-shell"><header class="admin-header"><a class="brand" data-route href="/admin" aria-label="Shiyam’s Games List admin">${brand}</a><div>${escape(profile.username)} <span class="role-badge">${profile.role==='super_admin'?'Super Admin':'Admin'}</span><button id="logout" type="button">Sign out</button></div></header><nav class="admin-nav" aria-label="Admin navigation">${[['/admin','Overview'],['/admin/games','Games'],['/admin/playing','Currently playing'],...(profile.role==='super_admin'?[['/admin/users','Admin users']]:[]),['/admin/settings','Settings']].map(([path,label])=>`<a data-route href="${path}" ${localPath()===path?'aria-current="page"':''}>${label}</a>`).join('')}<a href="/">View website</a></nav><main class="admin-main"><h1>${title}</h1><div id="admin-content">${loader('Loading your workspace',true)}</div></main></div>`;
  normalizeLinks(root);
  $('#logout').onclick=async()=>{routeVersion++;profile=null;root.innerHTML=loader('Signing out',true);await client.auth.signOut({scope:'local'});navigate('/admin/login');};
 }
 function login(){
  root.innerHTML=`<main class="admin-login admin-panel"><a href="/">${icon('back')} Back to collection</a><a class="brand login-brand" href="/" aria-label="Shiyam’s Games List">${brand}</a><h1>Admin sign in</h1><p>Use your administrator email and password.</p><form id="login-form">${field('email','Email','','email','required autocomplete="username"')}${field('password','Password','','password','required autocomplete="current-password"')}${notice}<button class="primary">Sign in</button></form></main>`;
  normalizeLinks(root);
  $('#login-form').onsubmit=event=>{event.preventDefault();const form=event.currentTarget;busy(form,async()=>{const data=new FormData(form);const {error}=await client.auth.signInWithPassword({email:data.get('email').trim(),password:data.get('password')});if(error)throw {userMessage:'Unable to sign in. Check your email and password.'};const allowed=await guard();if(!allowed){await client.auth.signOut({scope:'local'});throw {userMessage:'This account is not an active administrator. Contact the Super Admin.'};}navigate('/admin');});};
 }
 async function render(){
  const version=++routeVersion;root.innerHTML=loader('Opening your workspace',true);
  try{
   profile=await guard();if(version!==routeVersion)return;
   if(!profile){if(localPath()!=='/admin/login')history.replaceState({},'',sitePath('/admin/login'));login();return;}
   if(localPath()==='/admin/login')history.replaceState({},'',sitePath('/admin'));
   const path=localPath().replace(/\/$/,'');
   const titles={'/admin':'Overview','/admin/games':'Games','/admin/games/new':'Add game','/admin/playing':'Currently playing','/admin/users':'Admin users','/admin/settings':'Settings'};
   shell(titles[path] || (/^\/admin\/games\/\d+\/edit$/.test(path)?'Edit game':'Page not found'));
   const content=$('#admin-content');
   if(path==='/admin/users' && profile.role!=='super_admin'){content.textContent='Only the Super Admin can manage administrator accounts.';return;}
   const routes={'/admin':dashboard,'/admin/games':gamesPage,'/admin/games/new':()=>gameForm(null),'/admin/playing':playingPage,'/admin/users':usersPage,'/admin/settings':settingsPage};
   const edit=path.match(/^\/admin\/games\/(\d+)\/edit$/);
   const view=routes[path] || (edit?()=>gameForm(Number(edit[1])):async()=>({html:'<p>This admin page does not exist.</p>',bind(){}}));
   const result=await view();if(version!==routeVersion)return;content.innerHTML=result.html;result.bind?.();normalizeLinks(root);if(flash){message(flash);flash='';}
  }catch{if(version===routeVersion){root.innerHTML='<main class="admin-login"><h1>Unable to load this page</h1><p role="alert">Check your connection and try again.</p><button id="retry">Retry</button></main>';$('#retry').onclick=render;}}
 }
 async function dashboard(){
  const games=await service.getGames();const activity=check(await client.from('activity_log').select('*').order('created_at',{ascending:false}).limit(10));
  return {html:`<div class="admin-stats">${[['All games',games.length],...Object.entries(statuses).map(([s,l])=>[l,games.filter(g=>g.status===s).length])].map(([l,n])=>`<div class="admin-panel"><strong>${n}</strong><span>${l}</span></div>`).join('')}</div><div class="admin-actions"><a data-route class="button-link primary" href="/admin/games/new">Add game</a><a data-route class="button-link" href="/admin/games">Manage games</a><a data-route class="button-link" href="/admin/playing">Manage currently playing</a>${profile.role==='super_admin'?'<a data-route class="button-link" href="/admin/users">Manage admin users</a>':''}</div><section class="admin-panel"><h2>Recent activity</h2>${activity.length?`<ul class="activity-list">${activity.map(a=>`<li><span>${escape(a.label)} <small>${escape(a.action)} · ${a.entity==='games'?'Game':'Admin'}</small></span><time>${escape(new Date(a.created_at).toLocaleString())}</time></li>`).join('')}</ul>`:'<p>No changes recorded yet.</p>'}</section>`};
 }
 async function gamesPage(){
  let games=await service.getGames();
  return {html:`<div class="admin-toolbar"><label>Search<input id="game-search" type="search" placeholder="Game title"></label><label>Status<select id="game-status"><option value="">All statuses</option>${options(statuses,'')}</select></label><label>Sort<select id="game-sort">${options({name:'Name A–Z',newest:'Release year: newest',oldest:'Release year: oldest'},'name')}</select></label><a data-route class="button-link primary" href="/admin/games/new">Add game</a></div>${notice}<p id="game-count" role="status"></p><div id="admin-games" class="admin-list"></div>`,bind(){
   function list(){const query=$('#game-search').value.trim().toLowerCase(),status=$('#game-status').value,sort=$('#game-sort').value;
    const found=games.filter(g=>g.title.toLowerCase().includes(query) && (!status || g.status===status)).sort((a,b)=>sort==='name'?a.title.localeCompare(b.title):a.year==='TBA'?1:b.year==='TBA'?-1:(sort==='newest'?b.year-a.year:a.year-b.year)||a.title.localeCompare(b.title));
    $('#game-count').textContent=`${found.length} games`;
    $('#admin-games').innerHTML=found.length?found.map(g=>`<article class="admin-row"><div><h3>${escape(g.title)}</h3><span class="muted">${escape(g.year)} · ${escape(g.genres.join(', '))}</span></div><label class="status-control"><span class="sr-only">Status for ${escape(g.title)}</span><select data-status-id="${g.id}">${options(statuses,g.status)}</select></label><div class="admin-actions"><a data-route class="button-link" href="/admin/games/${g.id}/edit">Edit</a><button type="button" class="danger" data-delete="${g.id}">Delete</button></div></article>`).join(''):'<p class="admin-panel">No games match these filters.</p>';normalizeLinks(root);
   }
   for(const id of ['game-search','game-status','game-sort'])$('#'+id).addEventListener(id==='game-search'?'input':'change',list);
   $('#admin-games').onchange=async event=>{const select=event.target.closest('[data-status-id]');if(!select)return;const game=games.find(g=>g.id===Number(select.dataset.statusId)),old=game.status;select.disabled=true;try{await service.setStatus(game.id,select.value);game.status=select.value;message('Status updated.');list();}catch(e){select.value=old;message(friendlyError(e),true);}finally{select.disabled=false;}};
   $('#admin-games').onclick=event=>{const button=event.target.closest('[data-delete]');if(!button)return;const game=games.find(g=>g.id===Number(button.dataset.delete));confirmDelete(game.title,async()=>{await service.remove(game.id);games=games.filter(g=>g.id!==game.id);list();message('Game deleted.');});};list();
  }};
 }
 function confirmDelete(label,action){
  const dialog=document.createElement('dialog');dialog.className='admin-confirm';dialog.innerHTML=`<h2>Delete ${escape(label)}?</h2><p>This removes the record permanently.</p>${notice}<div class="admin-actions"><button type="button" data-cancel>Cancel</button><button type="button" class="danger" data-confirm>Delete</button></div>`;root.append(dialog);dialog.showModal();dialog.querySelector('[data-cancel]').focus();dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());dialog.querySelector('[data-confirm]').onclick=()=>busy(dialog,async()=>{await action();dialog.close();});
 }
 async function gameForm(id){
  const [game,collection]=await Promise.all([id?service.getGameById(id):{title:'',year:'',genres:[],status:'unplayed'},service.getGames()]);
  const sourceFields=[['posterSource','Artwork source'],['videoChannel','Trailer channel'],['videoSource','Trailer source'],['metacriticSource','Metacritic source'],['metacriticPlatform','Metacritic platform'],['metacriticChecked','Score checked on'],['descriptionSource','Description source']];
  return {html:`<form id="game-form" class="admin-panel"><div class="admin-form-grid">${field('title','Game title',game.title,'text','required maxlength="300"')}${field('year','Release year (blank = TBA)',game.year==='TBA'?'':game.year,'number','min="1000" max="9999" step="1"')}${genrePickerHTML}<label>Status<select name="status">${options(statuses,game.status)}</select></label><label class="check-label"><input type="checkbox" name="future" ${game.future?'checked':''}> Upcoming / future release</label>${field('metacritic','Metacritic score',game.metacritic??'','number','min="0" max="100" step="1"')}${field('poster','Artwork URL',game.poster,'url')}${field('videoId','YouTube trailer ID or URL',game.videoId)}${field('criticVideoUrl','YouTube critic reviews URL',game.criticVideoUrl,'url')}${field('ratingUrl','Critic reviews page URL',game.ratingUrl,'url')}${field('downloadLink','Torrent / download URL',game.downloadLink,'url')}<label class="full-width">Description<textarea name="description" rows="5" maxlength="5000">${escape(game.description)}</textarea></label></div><details><summary>Source metadata</summary><div class="admin-form-grid">${sourceFields.map(([key,label])=>field(key,label,game[key],key==='metacriticChecked'?'date':key.endsWith('Source')?'url':'text')).join('')}</div></details>${notice}<div class="admin-actions"><button class="primary">${id?'Save changes':'Add game'}</button><a data-route class="button-link" href="/admin/games">Cancel</a></div></form>`,bind(){
   const selectedGenres=bindGenrePicker($('.genre-picker'),game.genres,collection.flatMap(g=>g.genres));
   $('#game-form').onsubmit=event=>{event.preventDefault();const form=event.currentTarget;busy(form,async()=>{const raw=Object.fromEntries(new FormData(form));const next={...raw,future:raw.future==='on',genres:selectedGenres(),metacritic:raw.metacritic===''?null:Number(raw.metacritic),metacriticChecked:raw.metacriticChecked || null};let valid;try{valid=validateGame(next);}catch(e){throw {userMessage:e.message};}if(id)await service.update(id,valid);else{const created=await service.create(valid);flash='Game added successfully.';navigate(`/admin/games/${created.id}/edit`);}},id?'Game saved.':'Game added.');};
  }};
 }
 async function playingPage(){
  const games=(await service.getGames()).sort((a,b)=>a.title.localeCompare(b.title)),selected=new Set(games.filter(g=>g.status==='playing').map(g=>g.id));
  return {html:`<form id="playing-form" class="admin-panel"><p>Select as many games as you like. Games removed from this selection return to Yet to play.</p><label>Search games<input id="playing-search" type="search"></label><p id="playing-count" role="status"></p><div id="playing-list" class="playing-options"></div>${notice}<button class="primary">Save selection</button></form>`,bind(){
   const count=()=>$('#playing-count').textContent=`${selected.size} selected`;
   function list(){const found=games.filter(g=>g.title.toLowerCase().includes($('#playing-search').value.toLowerCase()));$('#playing-list').innerHTML=found.length?found.map(g=>`<label class="check-label"><input type="checkbox" value="${g.id}" ${selected.has(g.id)?'checked':''}> <span>${escape(g.title)} <small>${escape(g.year)} · ${statuses[g.status]}</small></span></label>`).join(''):'<p>No games found.</p>';count();}
   $('#playing-search').oninput=list;$('#playing-list').onchange=event=>{const id=Number(event.target.value);event.target.checked?selected.add(id):selected.delete(id);count();};$('#playing-form').onsubmit=event=>{event.preventDefault();busy(event.currentTarget,async()=>{const saved=new Set(selected);await service.setPlaying([...saved]);for(const g of games){if(saved.has(g.id))g.status='playing';else if(g.status==='playing')g.status='unplayed';}list();},'Currently playing selection saved.');};list();
  }};
 }
 async function usersPage(){
  const users=check(await client.from('admin_profiles').select('*').order('created_at'));
  return {html:`<section class="admin-panel"><h2>Add admin</h2><form id="create-admin"><div class="admin-form-grid">${field('username','Username','','text','required minlength="2" maxlength="40" pattern="[A-Za-z0-9_ .\\-]+"')}${field('email','Email','','email','required autocomplete="off"')}${field('password','Temporary password (12+ characters)','','password','required minlength="12" autocomplete="new-password"')}<p>Role: Admin. Share the temporary password securely; the new admin can change it in Settings.</p></div>${notice}<button class="primary">Create admin</button></form></section><div class="admin-list">${users.map(user=>`<form class="admin-row user-row" data-user="${user.id}"><div><h3>${escape(user.username)}</h3><p>${escape(user.email)}</p><span class="role-badge">${user.role==='super_admin'?'Super Admin':user.is_active?'Active admin':'Inactive admin'}</span></div>${user.role==='admin'?`${field('username','Username',user.username,'text','required minlength="2" maxlength="40"')}<label class="check-label"><input name="active" type="checkbox" ${user.is_active?'checked':''}> Active</label><div class="admin-actions"><button>Save</button><button type="button" class="danger" data-remove-user="${user.id}">Delete</button></div>${notice}`:'<p>Protected account · edit your username in Settings.</p>'}</form>`).join('')}</div>`,bind(){
   async function manage(body){const {data,error}=await client.functions.invoke('manage-admins',{body});if(error || data?.error)throw {userMessage:data?.error || 'User management failed. Verify the account details and Edge Function deployment, then try again.'};}
   $('#create-admin').onsubmit=event=>{event.preventDefault();const form=event.currentTarget;busy(form,async()=>{await manage({action:'create',...Object.fromEntries(new FormData(form))});form.reset();flash='Admin created.';await render();});};
   root.querySelectorAll('[data-user]').forEach(form=>{const user=users.find(u=>u.id===form.dataset.user);form.onsubmit=event=>{event.preventDefault();busy(form,async()=>{const data=new FormData(form);await rpc('manage_admin_profile',{target_id:user.id,new_username:data.get('username').trim(),active:data.get('active')==='on'});flash='Admin updated.';await render();});};form.querySelector('[data-remove-user]')?.addEventListener('click',()=>confirmDelete(user.username,async()=>{await manage({action:'delete',userId:user.id});flash='Admin deleted.';await render();}));});
  }};
 }
 async function settingsPage(){
  return {html:`<div class="settings-grid"><form id="username-form" class="admin-panel"><h2>Display identity</h2>${field('username','Username',profile.username,'text','required minlength="2" maxlength="40"')}<p>Signed in as ${escape(profile.email)}</p>${notice}<button>Save username</button></form><form id="password-form" class="admin-panel"><h2>Change password</h2>${field('current','Current password','','password','required autocomplete="current-password"')}${field('password','New password','','password','required minlength="12" autocomplete="new-password"')}${field('confirm','Confirm new password','','password','required minlength="12" autocomplete="new-password"')}${notice}<button>Change password</button></form><form id="email-form" class="admin-panel"><h2>Change email</h2><p>Confirm the change through the messages sent by Supabase. Your current email remains in use until verification is complete.</p>${field('email','New email','','email','required autocomplete="email"')}${notice}<button>Send verification</button></form></div>`,bind(){
   $('#username-form').onsubmit=event=>{event.preventDefault();const form=event.currentTarget;busy(form,()=>rpc('update_my_username',{new_username:new FormData(form).get('username').trim()}),'Username saved. It will appear in the header on your next page.');};
   $('#password-form').onsubmit=event=>{event.preventDefault();const form=event.currentTarget;busy(form,async()=>{const data=new FormData(form);if(data.get('password')!==data.get('confirm'))throw {userMessage:'New passwords do not match.'};const verified=await client.auth.signInWithPassword({email:profile.email,password:data.get('current')});if(verified.error)throw {userMessage:'The current password could not be verified.'};const result=await client.auth.updateUser({password:data.get('password')});if(result.error)throw {userMessage:'Password update failed. Check your project’s password requirements and try again.'};form.reset();},'Password changed successfully.');};
   $('#email-form').onsubmit=event=>{event.preventDefault();const form=event.currentTarget;busy(form,async()=>{const {error}=await client.auth.updateUser({email:new FormData(form).get('email').trim()},{emailRedirectTo:location.origin+sitePath('/admin/settings')});if(error)throw error;form.reset();},'Check your email to verify the change.');};
  }};
 }
 client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){profile=null;routeVersion++;if(localPath()!=='/admin/login'){history.replaceState({},'',sitePath('/admin/login'));login();}}});
 window.addEventListener('focus',async()=>{if(!profile)return;try{if(!await guard()){await client.auth.signOut({scope:'local'});navigate('/admin/login');}}catch{/* Keep page visible during an outage; RLS still protects every write. */}});
 await render();
}
