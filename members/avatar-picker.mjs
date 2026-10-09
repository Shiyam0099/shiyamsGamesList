import {characters,avatarURL,avatarCategories,avatarCategory} from './avatars.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function avatarPicker(selected=0){
 const current=avatarCategory(selected);
 return `<fieldset class="avatar-field"><legend>Choose your character · ${characters.length} SVG portraits</legend><div class="avatar-tabs" role="tablist" aria-label="Portrait categories">${avatarCategories.map(([key,label])=>`<button type="button" role="tab" id="avatar-tab-${key}" aria-controls="avatar-panel-${key}" aria-selected="${key===current}" tabindex="${key===current?0:-1}" data-avatar-tab="${key}">${label}<span>${characters.filter((_,i)=>avatarCategory(i)===key).length}</span></button>`).join('')}</div>${avatarCategories.map(([key,label])=>`<div role="tabpanel" id="avatar-panel-${key}" aria-labelledby="avatar-tab-${key}" ${key===current?'':'hidden'}><div class="avatar-grid">${characters.map(([name],i)=>avatarCategory(i)===key?`<label class="avatar-choice"><input type="radio" name="avatar_id" value="${i}" ${Number(selected)===i?'checked':''}><img src="${avatarURL(i)}" alt="" loading="lazy"><span>${esc(name)}</span></label>`:'').join('')}</div></div>`).join('')}<p class="avatar-selection" role="status">Selected: ${esc(characters[selected]?.[0]||characters[0][0])}</p></fieldset>`;
}
export function bindAvatarPicker(form){
 const tabs=[...form.querySelectorAll('[data-avatar-tab]')];
 function select(tab){
  for(const button of tabs){const active=button===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;form.querySelector('#'+button.getAttribute('aria-controls')).hidden=!active;}
 }
 tabs.forEach((tab,i)=>{
  tab.onclick=()=>select(tab);
  tab.onkeydown=e=>{const next={ArrowRight:(i+1)%tabs.length,ArrowLeft:(i+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[e.key];if(next===undefined)return;e.preventDefault();select(tabs[next]);tabs[next].focus();};
 });
 form.querySelector('.avatar-field').addEventListener('change',event=>{
  if(event.target.name==='avatar_id')form.querySelector('.avatar-selection').textContent='Selected: '+characters[Number(event.target.value)][0];
 });
}
