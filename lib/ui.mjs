const paths={
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/>',
 link:'<path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-1 1"/>',
 game:'<path d="M7 7h10a4 4 0 0 1 4 3l1 7a2 2 0 0 1-3 2l-4-3H9l-4 3a2 2 0 0 1-3-2l1-7a4 4 0 0 1 4-3Z M6 10v4m-2-2h4m8-1h.01M18 13h.01"/>',
 tag:'<path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="7.5" cy="7.5" r="1"/>',
 star:'<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.8 9.7l6.4-.9Z"/>',
 video:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4Z"/>',
 text:'<path d="M4 5h16M4 10h16M4 15h12M4 20h8"/>',
 sort:'<path d="M8 3v18m-4-4 4 4 4-4M14 5h7m-7 5h5m-5 5h3"/>',
 status:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 play:'<path d="m8 4 12 8-12 8Z"/>',
 back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
 shuffle:'<path d="m3 5 4 0 10 14h4m-4-4 4 4-4 4M3 19h4l4-6m2-2 4-6h4m-4-4 4 4-4 4"/>',
 plus:'<path d="M12 4v16M4 12h16"/>'
};
export const icon=(name)=>`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.game}</svg>`;
export const brand=`<span class="brand-mark">S<span>+</span></span><span>SHIYAM\`S<span class="brand-sub">GAMES LIST</span></span>`;
export const loader=(label='Loading collection',compact=false)=>`<div class="loading-experience ${compact?'is-compact':''}" role="status" aria-live="polite"><div class="loading-orbit" aria-hidden="true"><span class="orbit-ring"></span><span class="orbit-core">${icon('game')}</span><span class="orbit-dot"></span></div><div class="loading-copy"><span class="loading-kicker">SHIYAM’S GAMES LIST</span><h2>${label}</h2><p>A new adventure is taking shape.</p><span class="loading-track" aria-hidden="true"><span></span></span></div></div>`;
export function decorateFields(root=document){
 for(const control of root.querySelectorAll('input:not([type="checkbox"]):not([type="hidden"]),select,textarea')){
  if(control.closest('.icon-field'))continue;
  const name=(control.name || control.id || '').toLowerCase();
  const kind=control.type==='password'?'lock':control.type==='email'?'mail':/search/.test(name)?'search':/username/.test(name)?'user':/year|checked/.test(name)?'calendar':/metacritic$/.test(name)?'star':/video/.test(name)?'video':/genre/.test(name)?'tag':/status/.test(name)?'status':/sort/.test(name)?'sort':control.type==='url'?'link':control.tagName==='TEXTAREA'?'text':/rec-mode/.test(name)?'shuffle':'game';
  const wrapper=document.createElement('span');wrapper.className='icon-field';control.before(wrapper);wrapper.innerHTML=icon(kind);wrapper.append(control);
 }
}
export function observeFields(){decorateFields();const observer=new MutationObserver(()=>decorateFields());observer.observe(document.body,{childList:true,subtree:true});}
