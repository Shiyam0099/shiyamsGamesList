import {animateContent,pageReady} from '../lib/motion.mjs';
import {excludedExternalContent} from '../supabase/functions/_shared/content-policy.mjs';
import './editorial.css';
import './radar.css';
import {icon,loader} from '../lib/ui.mjs';
import {sitePath,normalizeLinks} from '../lib/routes.mjs';
import {esc,safe,gameCard,imageFallbacks} from './radar-cards.mjs';
const modes={trending:['Most played right now','game','Current online players among the top 25 entries in Steam’s most-played chart. Games only; Steam coverage, not all platforms.'],month:['Releasing this month','calendar','Up to 40 release highlights for the current UTC month, selected by RAWG community interest and shown in date order. Includes earlier releases this month; dates may change.'],anticipated:['Anticipated this year','star','Upcoming games from today through December 31, ranked by RAWG users adding them to their lists. Community interest, not review scores. Games without dates are excluded.'],'last-year':['Popular last year','star','The 40 most popular releases from the previous calendar year, ranked by RAWG community list additions. Popularity, not live player counts.']};
export async function startRadar(client){
 const root=document.createElement('div');root.id='radar-app';
 const source=document.querySelector('#public-app'),header=source.querySelector('header').cloneNode(true),footer=source.querySelector('footer').cloneNode(true);
 for(const el of [header,footer])el.querySelectorAll('a[href^="#"]').forEach(a=>a.setAttribute('href',sitePath('/')+a.getAttribute('href')));
 header.querySelectorAll('nav a').forEach(a=>{if(a.getAttribute('href')===sitePath('/radar'))a.setAttribute('aria-current','page');});
 root.innerHTML=`${header.outerHTML}<main class="editorial-main"><section class="editorial-intro"><div><p class="eyebrow">YOUR NEXT WORLD IS OUT THERE</p><h1>Gaming radar.</h1><p class="editorial-description">What’s being played. What’s arriving. What’s worth watching.</p></div><div class="editorial-mark" aria-hidden="true">${icon('game')}</div></section><div class="radar-tabs" role="tablist" aria-label="Explore games">${Object.entries(modes).map(([k,v])=>`<button id="radar-tab-${k}" role="tab" aria-controls="radar-panel" aria-selected="${k==='trending'}" tabindex="${k==='trending'?0:-1}" data-kind="${k}">${icon(v[1])} ${v[0]}</button>`).join('')}</div><section id="radar-panel" role="tabpanel"><div class="editorial-toolbar"><h2 id="radar-heading"></h2><button id="radar-refresh">${icon('refresh')} Refresh</button></div><p id="radar-note" class="muted"></p><div class="editorial-status"><p id="radar-count" role="status"></p><p id="radar-updated"></p></div><p id="radar-notice" role="status" hidden></p><div id="radar-content"></div><p class="editorial-attribution">Player data from <a href="https://store.steampowered.com/charts/mostplayed" target="_blank" rel="noopener noreferrer">Steam</a>. Release dates, artwork and community interest from <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer">RAWG</a>. Player counts refresh every 10 minutes; releases every 6 hours. Artwork belongs to its respective owners.</p></section></main>${footer.outerHTML}`;
 document.body.append(root);pageReady(root);normalizeLinks(root);document.querySelector('#load-state').hidden=true;document.title='Gaming Radar — Shiyam’s Games List';
 const $=s=>root.querySelector(s),cache=new Map();let kind='trending',requestId=0;
 function render(payload){
  const items=payload.items.filter(g=>g&&!excludedExternalContent(g)&&typeof g.title==='string'&&safe(g.url));
  $('#radar-count').textContent=items.length+' games';$('#radar-updated').textContent='Updated '+new Date(payload.updatedAt).toLocaleString();
  $('#radar-notice').hidden=!(payload.stale||payload.partial);$('#radar-notice').textContent=payload.stale?'Showing saved data. Live updates are temporarily unavailable.':'Some Steam entries are temporarily unavailable. Showing available games.';
  $('#radar-content').innerHTML=items.length?`<div class="radar-grid">${items.map((g,i)=>gameCard(g,i,kind)).join('')}</div>`:`<div class="editorial-empty">${icon('calendar')}<h2>No games listed yet.</h2><p>The source has no matching releases for this period. Check back as dates are announced.</p></div>`;
  imageFallbacks(root);animateContent($('#radar-content'));
 }
 async function load(force=false){
  const selected=kind,id=++requestId,now=new Date(),cacheKey=kind+':'+now.toISOString().slice(0,10);$('#radar-heading').textContent=modes[kind][0]+(kind==='month'?' · '+now.toLocaleDateString(undefined,{month:'long',year:'numeric',timeZone:'UTC'}):kind==='anticipated'?' · '+now.getUTCFullYear():kind==='last-year'?' · '+(now.getUTCFullYear()-1):'');$('#radar-note').textContent=modes[kind][2];
  $('#radar-panel').setAttribute('aria-labelledby','radar-tab-'+kind);$('#radar-refresh').disabled=true;$('#radar-panel').setAttribute('aria-busy','true');$('#radar-notice').hidden=true;
  const cached=cache.get(cacheKey),stored=cached && Date.now()-Date.parse(cached.payload.updatedAt)<86400000?cached:null;if(stored)render(stored.payload);else{$('#radar-content').innerHTML=loader('Scanning the gaming world',true);$('#radar-count').textContent='';$('#radar-updated').textContent='';}
  try{
   if(!force&&stored&&stored.expires>Date.now())return;
   const {data,error}=await client.functions.invoke('gaming-radar?kind='+selected,{method:'GET'});if(error||!Array.isArray(data?.items))throw new Error('Unavailable');
   cache.set(cacheKey,{payload:data,expires:Date.now()+300000});if(id===requestId)render(data);
  }catch{if(id===requestId){if(stored)render({...stored.payload,stale:true});else $('#radar-content').innerHTML=`<div class="editorial-empty" role="alert">${icon('refresh')}<h2>Radar is taking a break.</h2><p>We couldn’t load this category. Try Refresh in a moment.</p></div>`;}}
  finally{if(id===requestId){$('#radar-refresh').disabled=false;$('#radar-panel').removeAttribute('aria-busy');}}
 }
 const tabs=[...root.querySelectorAll('[role=tab]')];function select(button){kind=button.dataset.kind;tabs.forEach(b=>{b.setAttribute('aria-selected',String(b===button));b.tabIndex=b===button?0:-1;});load();}
 tabs.forEach((button,i)=>{button.onclick=()=>select(button);button.onkeydown=e=>{const next={ArrowRight:(i+1)%tabs.length,ArrowLeft:(i+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[e.key];if(next===undefined)return;e.preventDefault();tabs[next].focus();select(tabs[next]);};});
 $('#radar-refresh').onclick=()=>load(true);setInterval(()=>{if(!document.hidden)load(true);},600000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load(true);});await load();
}
