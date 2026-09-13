import {icon} from '../lib/ui.mjs';
// Broad starting vocabulary; existing collection labels and custom genres remain valid.
const catalogue=[
 'Action','Action Adventure','Action RPG','Adventure','Arcade','Arena Shooter','Artillery','Auto Battler',
 'Battle Royale','Beat ’em Up','Board Game','Bullet Hell','Card Game','Casual','City Builder','Collectathon',
 'Colony Sim','Comedy','Construction & Management','Cooking','Co-op','Crime','Deckbuilder','Detective',
 'Dungeon Crawler','Educational','Exploration','Extraction Shooter','Factory Automation','Farming Sim',
 'Fighting','Flight Sim','Football','FPS','Grand Strategy','Hack and Slash','Hidden Object','Horror',
 'Idle / Incremental','Immersive Sim','Interactive Fiction','JRPG','Life Sim','Looter Shooter','Management',
 'Metroidvania','MMO','MMORPG','MOBA','Music','Mystery','Narrative Adventure','Open World','Party',
 'Pinball','Platformer','Point & Click','Precision Platformer','Psychological Horror','Puzzle',
 'Puzzle Platformer','Racing','Real-Time Strategy','Real-Time Tactics','Rhythm','Roguelike','Roguelite',
 'RPG','Sandbox','Sci-Fi','Shoot ’em Up','Shooter','Simulation','Social Deduction','Soulslike','Space Sim',
 'Sports','Stealth','Strategy','Survival','Survival Horror','Tactical RPG','Tactical Shooter','Third-Person Shooter',
 'Tower Defense','Trading','Trivia','Turn-Based RPG','Turn-Based Strategy','Turn-Based Tactics','Vehicle Combat',
 'Visual Novel','VR','Walking Simulator','Western','Wrestling','4X'
];
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const genrePickerHTML=`<div class="genre-picker"><span id="genres-label" class="genre-label">Genres</span><button type="button" id="genres-toggle" aria-labelledby="genres-label genres-summary" aria-expanded="false" aria-controls="genres-dropdown">${icon('tag')}<span id="genres-summary">Select genres</span><svg class="ui-icon genre-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div id="genres-selected" class="genre-chips"></div><div id="genres-dropdown" class="genre-dropdown" hidden><label for="genre-search" class="sr-only">Search or add a genre</label><input id="genre-search" type="search" placeholder="Search or add a genre…" autocomplete="off"><div id="genre-options" class="genre-options" role="group" aria-label="Available genres"></div><p id="genres-feedback" class="genre-feedback" role="status"></p></div><small class="genre-help">Select multiple genres, or search to add your own.</small></div>`;
export function bindGenrePicker(root,initial=[],existing=[]){
 const selected=new Set(initial),choices=[...new Set([...catalogue,...existing,...initial])].sort((a,b)=>a.localeCompare(b));
 const toggle=root.querySelector('#genres-toggle'),panel=root.querySelector('#genres-dropdown'),search=root.querySelector('#genre-search'),list=root.querySelector('#genre-options'),chips=root.querySelector('#genres-selected'),feedback=root.querySelector('#genres-feedback');
 const isBusy=()=>Boolean(root.closest('form')?.dataset.busy);
 function setOpen(open,focus=false){panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open && focus)search.focus();}
 function renderSelection(){
  root.querySelector('#genres-summary').textContent=selected.size?`${selected.size} genre${selected.size===1?'':'s'} selected`:'Select genres';
  chips.innerHTML=[...selected].map(g=>`<button type="button" class="genre-chip" data-remove-genre="${escape(g)}" aria-label="Remove ${escape(g)}">${escape(g)}${icon('close')}</button>`).join('');
 }
 function renderOptions(){
  const query=search.value.trim(),matches=choices.filter(g=>g.toLowerCase().includes(query.toLowerCase()));
  list.innerHTML=matches.map(g=>`<label class="check-label genre-option"><input type="checkbox" value="${escape(g)}" ${selected.has(g)?'checked':''}><span>${escape(g)}</span></label>`).join('');
  if(query && !choices.some(g=>g.toLowerCase()===query.toLowerCase()))list.insertAdjacentHTML('beforeend',`<button type="button" class="genre-add">${icon('plus')} Add “${escape(query)}”</button>`);
  feedback.textContent=`${matches.length} suggestion${matches.length===1?'':'s'} · ${selected.size} selected`;
 }
 toggle.onclick=()=>{if(!isBusy())setOpen(panel.hidden,true);};
 search.oninput=renderOptions;
 list.onchange=event=>{if(isBusy())return;const box=event.target;if(box.type!=='checkbox')return;
  if(box.checked && selected.size>=30){box.checked=false;feedback.textContent='You can select up to 30 genres.';return;}
  box.checked?selected.add(box.value):selected.delete(box.value);renderSelection();feedback.textContent=`${selected.size} genres selected`;
 };
 list.onclick=event=>{if(isBusy() || !event.target.closest('.genre-add'))return;const value=search.value.trim();
  if(selected.size>=30){feedback.textContent='You can select up to 30 genres.';return;}
  if(value.length>80){feedback.textContent='Keep genre names under 80 characters.';return;}
  if(!value)return;choices.push(value);choices.sort((a,b)=>a.localeCompare(b));selected.add(value);search.value='';renderSelection();renderOptions();search.focus();
 };
 chips.onclick=event=>{const button=event.target.closest('[data-remove-genre]');if(!button || isBusy())return;selected.delete(button.dataset.removeGenre);renderSelection();renderOptions();toggle.focus();};
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape' && !panel.hidden){event.preventDefault();setOpen(false);toggle.focus();}
  if(event.key==='Enter' && event.target===search){event.preventDefault();list.querySelector('input,button')?.focus();}
  if(event.key==='ArrowDown' || event.key==='ArrowUp'){
   const controls=[search,...list.querySelectorAll('input,button')],index=controls.indexOf(event.target);
   if(index>=0){event.preventDefault();controls[Math.max(0,Math.min(controls.length-1,index+(event.key==='ArrowDown'?1:-1)))]?.focus();}
  }
 });
 root.addEventListener('focusout',event=>{if(event.relatedTarget && root.contains(event.relatedTarget))return;setTimeout(()=>{if(!root.contains(document.activeElement))setOpen(false);},0);});
 renderSelection();renderOptions();
 return ()=>[...selected];
}
