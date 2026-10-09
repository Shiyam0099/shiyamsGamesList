import {icon} from '../lib/ui.mjs';
import {sitePath} from '../lib/routes.mjs';
import {fromRow} from '../lib/game-data.mjs';
import {avatarURL,defaultBio} from './avatars.mjs';
import './members.css';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=null,client;
export const member=()=>state;
export async function memberRequest(body){
 const {data,error}=await client.functions.invoke('member-api',{body});
 if(error){let payload;try{payload=await error.context?.json();}catch{}throw new Error(payload?.error||'Could not complete the request. Check your connection and sign-in.');}
 if(data?.error)throw new Error(data.error);return data;
}
export async function memberRPC(name,args){const {data,error}=await client.rpc(name,args);if(error)throw new Error(error.code==='42501'?'Your account does not have access.':error.message||'Please try again.');return data;}
export async function refreshMember(){
 const {data:{session},error}=await client.auth.getSession();if(error)throw error;
 if(!session){state=null;return null;}
 const {data:{user},error:authError}=await client.auth.getUser();if(authError||!user){state=null;return null;}
 const [{data:profile,error:profileError},{data:admin,error:adminError}]=await Promise.all([client.from('member_profiles').select('*').eq('id',user.id).maybeSingle(),client.from('admin_profiles').select('role,is_active').eq('id',user.id).maybeSingle()]);
 if(profileError||adminError)throw profileError||adminError;
 state={user,profile,admin,active:!!profile?.is_active&&admin?.is_active!==false};return state;
}
export async function personalGames(){
 if(!state?.active)return [];
 const rows=[];for(let start=0;;start+=500){const {data,error}=await client.from('collection_entries').select('status,games(*)').eq('user_id',state.user.id).order('game_id').range(start,start+499);if(error)throw error;rows.push(...data);if(data.length<500)break;}
 return rows.filter(r=>r.games).map(r=>({...fromRow(r.games),status:r.status}));
}
export function memberHeader(root=document){
 for(const header of root.querySelectorAll('header:not(.admin-header)')){
  const avatar=header.querySelector('.avatar-link img');if(state&&avatar){avatar.src=avatarURL(state.profile?.avatar_id);avatar.alt='Your character avatar';}
  if(!header.querySelector('nav')||header.querySelector('.member-account-link'))continue;
  const a=document.createElement('a');a.className='member-account-link';a.href=sitePath('/account');
  const labelIcon=(control,name,label)=>{control.classList.add('member-icon-control');control.setAttribute('aria-label',label);control.innerHTML=icon(name)+`<span class="member-control-tooltip" aria-hidden="true">${label}</span>`;};
  if(state)labelIcon(a,'user','My account');else a.textContent='Sign in / Join';header.append(a);
  if(state?.admin?.is_active){const adminLink=document.createElement('a');adminLink.className='member-account-link';adminLink.href=sitePath('/admin');labelIcon(adminLink,'admin','Admin');header.append(adminLink);}
  if(state){const button=document.createElement('button');button.type='button';button.className='member-signout';labelIcon(button,'signout','Sign out');button.onclick=async()=>{button.disabled=true;const {error}=await client.auth.signOut({scope:'local'});if(error){button.disabled=false;notify('Could not sign out. Please retry.');}};header.append(button);}
 }
}
export function personalize(root){
 memberHeader(root);if(!state)return;
 const about=root.querySelector('#about');
 if(about){about.innerHTML=`<div class="portrait"><img src="${avatarURL(state.profile?.avatar_id)}" alt="Selected character avatar"><span>YOUR SAVE FILE</span></div><div><p class="eyebrow">BEHIND THE CONTROLLER</p><h2>${esc(state.profile?.display_name||'Player One')}<span class="lime">.</span></h2><p class="member-bio">${esc(state.profile?.bio||defaultBio)}</p><div class="about-tags"><span>My pace</span><span>My adventures</span><span>My collection</span></div><a class="profile-edit-button" href="${sitePath('/account')}#member-profile">${icon('user')}<span>Edit profile & avatar</span>${icon('external')}</a></div>`;}
 const image=root.querySelector('.avatar-link img');if(image){image.src=avatarURL(state.profile?.avatar_id);image.alt='Your character avatar';}
 const collection=root.querySelector('#collection');if(collection&&!state.active&&!collection.querySelector('.member-collection-tools')){const tools=document.createElement('div');tools.className='member-collection-tools';tools.innerHTML='<p role="alert">Your account is blocked. Contact an administrator. <a href="'+sitePath('/account')+'">Account</a></p>';collection.prepend(tools);}
}
export function addButton(game,kind){
 if(!state?.active)return '';
 return `<button class="member-add-game" type="button" ${kind==='trending'?`data-find-game="${esc(game.title)}"`:`data-add-rawg="${Number(game.id)}"`}>${kind==='trending'?'Find & add to collection':'Add to my collection'}</button>`;
}
export function notify(text){let el=document.querySelector('#member-toast');if(!el){el=document.createElement('p');el.id='member-toast';el.setAttribute('role','status');document.body.append(el);}el.textContent=text;el.hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.hidden=true,7000);}
export async function initMembers(supabase,{redirectOnSignOut=true}={}){
 client=supabase;await refreshMember();
 document.addEventListener('click',async e=>{const b=e.target.closest('[data-add-rawg],[data-find-game]');if(!b||b.disabled)return;
  if(b.dataset.findGame){location.href=sitePath('/account')+'?search='+encodeURIComponent(b.dataset.findGame);return;}
  b.disabled=true;b.textContent='Adding…';try{await memberRequest({action:'import',rawgId:Number(b.dataset.addRawg)});b.textContent='In your collection';notify('Saved to your collection.');}catch(error){b.disabled=false;b.textContent='Add to my collection';notify(error.message);}
 });
 client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'&&state){state=null;if(redirectOnSignOut)setTimeout(()=>location.assign(sitePath('/')),0);}});
}
