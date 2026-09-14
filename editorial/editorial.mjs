import {animateContent,pageReady} from '../lib/motion.mjs';
import {excludedExternalContent} from '../supabase/functions/_shared/content-policy.mjs';
import './editorial.css';
import {loader,icon} from '../lib/ui.mjs';
import {sitePath,normalizeLinks} from '../lib/routes.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol) && !url.username && !url.password?url.href:'';}catch{return '';}};
export async function startEditorial(client,kind){
 const reviews=kind==='reviews',publicRoot=document.querySelector('#public-app'),root=document.createElement('div');root.id='editorial-app';
 const header=publicRoot.querySelector('header').cloneNode(true);
 header.querySelectorAll('a[href^="#"]').forEach(a=>a.setAttribute('href',sitePath('/')+a.getAttribute('href')));
 header.querySelectorAll('nav a').forEach(a=>{if(a.getAttribute('href')===sitePath('/'+kind))a.setAttribute('aria-current','page');});
 const footer=publicRoot.querySelector('footer').cloneNode(true);footer.querySelectorAll('a[href="#"]').forEach(a=>a.setAttribute('href',sitePath('/')));
 root.innerHTML=`${header.outerHTML}<main class="editorial-main"><section class="editorial-intro"><div><p class="eyebrow">${reviews?'THE CRITICS’ CORNER':'BEYOND THE BACKLOG'}</p><h1>${reviews?'Worth your next adventure?':'Stay in the game.'}</h1><p class="editorial-description">${reviews?'The latest game reviews from independent gaming publications. Read their verdicts before choosing your next world.':'Fresh stories, announcements, and updates from across the gaming world.'}</p></div><div class="editorial-mark" aria-hidden="true">${icon(reviews?'star':'news')}</div></section><nav class="editorial-tabs" aria-label="Gaming updates"><a href="${sitePath('/news')}" ${!reviews?'aria-current="page"':''}>${icon('news')} Gaming News</a><a href="${sitePath('/reviews')}" ${reviews?'aria-current="page"':''}>${icon('star')} Latest Reviews</a></nav><section aria-label="${reviews?'Latest game reviews':'Latest gaming news'}"><div class="editorial-toolbar"><label class="editorial-search">Search ${reviews?'reviews':'news'}<input id="article-search" type="search" placeholder="Search headlines…"></label><label>Publication<select id="article-source"><option value="">All publications</option></select></label><button type="button" id="refresh-articles">${icon('refresh')} Refresh</button></div><div class="editorial-status"><p id="article-count" role="status"></p><p id="article-updated"></p></div><p id="article-notice" role="status" hidden></p><div id="article-content">${loader(reviews?'Finding the latest reviews':'Catching up on gaming',true)}</div><button type="button" id="more-articles" hidden>Load more ${reviews?'reviews':'stories'}</button><p class="editorial-attribution">Headlines and short excerpts from <a href="https://www.gamespot.com/" target="_blank" rel="noopener noreferrer">GameSpot</a> and <a href="https://www.pcgamer.com/" target="_blank" rel="noopener noreferrer">PC Gamer</a>. Full articles, reviews, and images belong to their publishers. Links open at the original publication.</p></section></main>${footer.outerHTML}`;
 document.body.append(root);pageReady(root);normalizeLinks(root);document.querySelector('#load-state').hidden=true;
 document.title=`${reviews?'Latest Game Reviews':'Gaming News'} — Shiyam’s Games List`;
 const $=selector=>root.querySelector(selector);let items=[],limit=12,loading=false,loaded=false;
 const cacheKey='gaming-editorial-v1-'+kind;
 function render(){
  const query=$('#article-search').value.toLowerCase().trim(),source=$('#article-source').value;
  const filtered=items.filter(item=>(!source || item.source===source) && `${item.title} ${item.excerpt}`.toLowerCase().includes(query));
  $('#article-count').textContent=`${filtered.length} ${reviews?'reviews':'stories'} · Latest first`;
  $('#more-articles').hidden=limit>=filtered.length;
  if(!filtered.length){$('#article-content').innerHTML=`<div class="editorial-empty">${icon('search')}<h2>${items.length?'No matching headlines':'No articles available yet'}</h2><p>${items.length?'Try another search or publication.':'Check back soon for new updates from our publishers.'}</p>${items.length?'<button type="button" id="clear-articles">Clear filters</button>':''}</div>`;$('#clear-articles')?.addEventListener('click',()=>{$('#article-search').value='';$('#article-source').value='';render();});return;}
  $('#article-content').innerHTML=`<div class="article-grid">${filtered.slice(0,limit).map((item,index)=>`<article class="article-card ${index===0 && !query && !source?'article-featured':''}"><a class="article-art" href="${escape(item.url)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">${item.image?`<img src="${escape(item.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}<span class="article-art-fallback">${icon(reviews?'star':'news')}</span><span class="article-type">${reviews?'Review':'News'}</span></a><div class="article-copy"><div class="article-meta"><span>${escape(item.source)}</span><time datetime="${escape(item.publishedAt)}">${escape(new Date(item.publishedAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}))}</time></div><h2><a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">${escape(item.title)}<span class="sr-only"> (opens in a new tab)</span></a></h2>${item.excerpt?`<p>${escape(item.excerpt)}</p>`:''}<div class="article-bottom"><span>${escape(item.author || item.source)}</span><a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="${reviews?'Read review':'Read story'}: ${escape(item.title)} (opens in a new tab)">${reviews?'Read review':'Read story'} ${icon('external')}</a></div></div></article>`).join('')}</div>`;
  animateContent($('#article-content'));
  root.querySelectorAll('.article-art img').forEach(img=>{img.addEventListener('error',()=>img.remove(),{once:true});});
 }
 function apply(payload,offline=false){
  if(!Array.isArray(payload.items))throw new Error('Invalid feed');
  items=payload.items.filter(item=>item && !excludedExternalContent(item) && typeof item.title==='string' && safe(item.url) && Number.isFinite(Date.parse(item.publishedAt))).map(item=>({...item,url:safe(item.url),image:safe(item.image)})).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  const current=$('#article-source').value;$('#article-source').innerHTML='<option value="">All publications</option>'+[...new Set(items.map(item=>item.source))].sort().map(source=>`<option>${escape(source)}</option>`).join('');$('#article-source').value=current;
  const updated=Date.parse(payload.updatedAt);$('#article-updated').textContent=Number.isFinite(updated)?'Updated '+new Date(updated).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'';
  $('#article-notice').hidden=!(offline || payload.stale || payload.partial);
  $('#article-notice').textContent=offline || payload.stale?'Showing saved articles. Live updates are temporarily unavailable.':payload.partial?'One publication is temporarily unavailable. Showing the latest available articles.':'';
  loaded=true;render();
 }
 async function refresh(force=false){
  if(loading)return;loading=true;$('#refresh-articles').disabled=true;$('#refresh-articles').setAttribute('aria-busy','true');let saved;
  try{
   try{saved=JSON.parse(sessionStorage.getItem(cacheKey));}catch{}
   if(!force && saved?.expires>Date.now()){apply(saved.payload);return;}
   const {data,error}=await client.functions.invoke('gaming-feed?kind='+kind,{method:'GET'});
   if(error)throw error;apply(data);
   try{sessionStorage.setItem(cacheKey,JSON.stringify({payload:data,expires:Date.now()+300000}));}catch{}
  }catch{
   if(saved?.payload && Number.isFinite(Date.parse(saved.payload.updatedAt)) && Date.now()-Date.parse(saved.payload.updatedAt)<86400000){try{apply(saved.payload,true);}catch{showError();}}
   else if(loaded){$('#article-notice').hidden=false;$('#article-notice').textContent='Unable to refresh right now. Your current articles are still available.';}
   else showError();
  }finally{loading=false;$('#refresh-articles').disabled=false;$('#refresh-articles').removeAttribute('aria-busy');}
 }
 function showError(){$('#article-content').innerHTML=`<div class="editorial-empty" role="alert">${icon('news')}<h2>The headlines are taking a break.</h2><p>We couldn’t reach the publications. Please try again.</p><button type="button" id="retry-articles">Try again</button></div>`;$('#retry-articles').onclick=()=>refresh(true);}
 $('#article-search').oninput=()=>{limit=12;if(loaded)render();};$('#article-source').onchange=()=>{limit=12;if(loaded)render();};$('#refresh-articles').onclick=()=>refresh(true);$('#more-articles').onclick=()=>{limit+=12;render();};
 await refresh();
}
