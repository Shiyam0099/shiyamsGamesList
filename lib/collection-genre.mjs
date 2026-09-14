import {icon} from './ui.mjs';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const searchKey=value=>value.toLowerCase().replace(/[-_]/g,' ').replace(/\s+/g,' ').trim();
function positionPanel(root,panel){
 const left=root.getBoundingClientRect().left,width=panel.getBoundingClientRect().width;
 panel.style.right='auto';panel.style.left=Math.max(16-left,Math.min(0,innerWidth-16-left-width))+'px';
}
window.addEventListener('resize',()=>{for(const root of document.querySelectorAll('.collection-genre-picker')){const panel=root.querySelector('.collection-genre-panel');if(panel && !panel.hidden)positionPanel(root,panel);}});
export function collectionGenreFilter(input,genres){
 const field=input.closest('.collection-genre-field');
 const root=document.createElement('div');root.className='collection-genre-picker';
 root.innerHTML=`<button type="button" id="collection-genre-toggle" aria-expanded="false" aria-controls="collection-genre-panel" aria-label="Genre: All genres">${icon('tag')}<span class="collection-genre-value">All genres</span><svg class="ui-icon genre-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div id="collection-genre-panel" class="collection-genre-panel" hidden><label class="sr-only" for="collection-genre-search">Search genres</label><input id="collection-genre-search" type="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="collection-genre-options" placeholder="Search genres…" autocomplete="off"><div id="collection-genre-options" role="listbox" aria-label="Genres"></div><p class="collection-genre-results" role="status"></p><button type="button" class="collection-genre-reset">Show all genres</button></div>`;
 field.append(root);
 const toggle=root.querySelector('#collection-genre-toggle'),panel=root.querySelector('#collection-genre-panel'),search=root.querySelector('input'),list=root.querySelector('[role=listbox]'),status=root.querySelector('[role=status]');
 const options=[{value:'',label:'All genres'},...genres.map(g=>({value:g,label:g}))];let matches=[],active=-1;
 function sync(){if(!options.some(option=>option.value===input.value))input.value='';const label=input.value || 'All genres';root.querySelector('.collection-genre-value').textContent=label;toggle.title=label;toggle.setAttribute('aria-label','Genre: '+label);}
 function highlight(index){
  active=index;const nodes=[...list.querySelectorAll('[role=option]')];
  nodes.forEach((node,i)=>node.classList.toggle('is-highlighted',i===active));
  if(nodes[active]){search.setAttribute('aria-activedescendant',nodes[active].id);nodes[active].scrollIntoView({block:'nearest'});}else search.removeAttribute('aria-activedescendant');
 }
 function render(){
  const query=searchKey(search.value);matches=options.filter(option=>searchKey(option.label).includes(query));
  list.innerHTML=matches.map((option,index)=>`<div role="option" id="collection-genre-option-${index}" data-index="${index}" aria-selected="${option.value===input.value}"><span>${escape(option.label)}</span>${option.value===input.value?icon('status'):''}</div>`).join('');
  status.textContent=matches.length?`${matches.length} ${matches.length===1?'option':'options'}`:'No matching genres. Try another search.';
  highlight(query && matches.length?0:matches.findIndex(option=>option.value===input.value));
 }
 function close(focus=false){panel.hidden=true;toggle.setAttribute('aria-expanded','false');search.setAttribute('aria-expanded','false');search.removeAttribute('aria-activedescendant');if(focus)toggle.focus();}
 function open(){panel.hidden=false;toggle.setAttribute('aria-expanded','true');search.setAttribute('aria-expanded','true');search.value='';render();positionPanel(root,panel);search.focus({preventScroll:true});}
 function choose(value){input.value=value;sync();close(true);input.dispatchEvent(new Event('change',{bubbles:true}));}
 toggle.onclick=()=>panel.hidden?open():close();
 toggle.onkeydown=event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open();if(event.key==='ArrowUp')highlight(matches.length-1);}};
 search.oninput=render;
 search.onkeydown=event=>{
  if(event.key==='ArrowDown' || event.key==='ArrowUp'){event.preventDefault();if(matches.length)highlight((active+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length);}
  if(event.key==='Home' && event.ctrlKey){event.preventDefault();highlight(0);}
  if(event.key==='End' && event.ctrlKey){event.preventDefault();highlight(matches.length-1);}
  if(event.key==='Enter'){event.preventDefault();if(matches[active])choose(matches[active].value);}
 };
 root.addEventListener('keydown',event=>{if(event.key==='Escape' && !panel.hidden){event.preventDefault();close(true);}});
 list.onpointerdown=event=>{if(event.target.closest('[role=option]'))event.preventDefault();};
 list.onclick=event=>{const option=event.target.closest('[data-index]');if(option)choose(matches[Number(option.dataset.index)].value);};
 root.querySelector('.collection-genre-reset').onclick=()=>choose('');
 root.addEventListener('focusout',event=>{if(event.relatedTarget && root.contains(event.relatedTarget))return;setTimeout(()=>{if(!root.contains(document.activeElement))close();},0);});
 input.addEventListener('change',sync);sync();return {sync};
}
