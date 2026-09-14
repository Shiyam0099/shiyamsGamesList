import './cinematic-hero.css';
import {icon} from './ui.mjs';
import {sitePath} from './routes.mjs';
import {anticipatedShowcase} from './hero-data.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
const DISPLAY_MS=5000;
const pauseIcon='<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
export function startCinematicHero(root,client){
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),events=new AbortController();let games=[],active=-1,layer=0,timer,paused=motion.matches,visible=true,hover=false,focused=false,sequence=0,fetching=false,updated=0,disposed=false;
 root.style.setProperty('--hero-duration',`${DISPLAY_MS}ms`);
 root.innerHTML=`<div class="hero-scene hero-scene-a" aria-hidden="true"></div><div class="hero-scene hero-scene-b" aria-hidden="true"></div><div class="hero-shade" aria-hidden="true"></div><div class="hero-grain" aria-hidden="true"></div><div class="hero-frame" aria-hidden="true"></div><div class="hero-topline"><p class="eyebrow">ON THE HORIZON <span>/ ${new Date().getUTCFullYear()}</span></p><span class="hero-edition"><span class="hero-live-dot" aria-hidden="true"></span> THE ANTICIPATION EDIT</span></div><div class="hero-stage"><div class="hero-copy"><p class="hero-kicker">THE NEXT CHAPTER AWAITS</p><h1>Worlds worth<br>waiting for<span>.</span></h1><p class="hero-description">Finding this year’s most anticipated upcoming games.</p></div><div class="hero-side" hidden></div></div><div class="hero-footer"><div class="hero-controls"><p class="hero-count">RELEASE RADAR</p><button class="hero-pause" aria-label="Pause cinematic showcase" aria-pressed="false" hidden>${pauseIcon}</button></div><div class="hero-chapters" role="group" aria-label="Choose a featured game"></div><div class="hero-bottom"><p class="hero-source">Upcoming through December 31 · Ranked by <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer">RAWG</a> community interest</p><a class="hero-all" href="${sitePath('/radar')}">Explore gaming radar ${icon('external')}</a></div></div><p class="sr-only hero-announcement" aria-live="polite"></p>`;
 const $=s=>root.querySelector(s);

 function releaseLabel(game){return new Date(game.releaseDate+'T12:00:00Z').toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});}
 function copyMarkup(game,index){
  const date=releaseLabel(game),platforms=(game.platforms||[]).filter(p=>typeof p==='string');
  return `<p class="hero-kicker"><span class="hero-live-dot" aria-hidden="true"></span> MOST ANTICIPATED / ${String(index+1).padStart(2,'0')}</p><h1 class="${game.title.length>36?'hero-long-title':''}">${esc(game.title)}<span>.</span></h1><div class="hero-meta"><span>${icon('calendar')} ${esc(date)}</span>${platforms.length?`<span>${esc(platforms.join(' / '))}</span>`:''}</div><p class="hero-description">New worlds. New obsessions. Your next great escape is on the horizon.</p><a class="hero-cta" href="${esc(safe(game.url)||sitePath('/radar'))}" target="_blank" rel="noopener noreferrer">Explore the game ${icon('external')}<span class="sr-only"> (opens in a new tab)</span></a>`;
 }
 function sideMarkup(index,artwork=true){
  const upcoming=games[(index+1)%games.length];
  return `<div class="hero-rank" aria-hidden="true"><span>THE WATCHLIST</span><span class="hero-giant">${String(index+1).padStart(2,'0')}</span><span>OF ${String(games.length).padStart(2,'0')} UPCOMING WORLDS</span></div><button class="hero-next" aria-label="Show next game: ${esc(upcoming.title)}">${artwork&&safe(upcoming.image)?`<img class="hero-next-art" src="${esc(safe(upcoming.image))}" alt="" decoding="async">`:""}<span class="hero-next-label">COMING INTO FOCUS <span>${String((index+1)%games.length+1).padStart(2,'0')}</span></span><strong>${esc(upcoming.title)}</strong><span class="hero-next-arrow">${icon('external')}</span></button>`;
 }
 // Reserve the tallest game's natural layout once per list/width/font change.
 // This keeps transitions stable without clipping long titles or enlarged text.
 function sizeStage(){
  if(disposed)return;
  const stage=$('.hero-stage');
  if(!games.length){stage.style.minHeight='';return;}
  const measure=document.createElement('div');
  measure.className='hero-stage hero-measure';measure.inert=true;measure.setAttribute('aria-hidden','true');
  root.append(measure);
  let height=0;
  for(let i=0;i<games.length;i++){
   measure.innerHTML=`<div class="hero-copy">${copyMarkup(games[i],i)}</div><div class="hero-side" ${games.length<2?'hidden':''}>${sideMarkup(i,false)}</div>`;
   height=Math.max(height,measure.getBoundingClientRect().height);
  }
  measure.remove();stage.style.minHeight=`${Math.ceil(height)}px`;
 }
 function stop(){clearTimeout(timer);root.classList.remove('hero-running');}
 function schedule(){stop();const running=games.length>1&&!paused&&visible&&!document.hidden&&!hover&&!focused&&!disposed;if(running){void root.offsetWidth;root.classList.add('hero-running');timer=setTimeout(()=>show((active+1)%games.length),DISPLAY_MS);}root.classList.toggle('hero-motion-paused',!running);}
 function setPause(value){paused=value;$('.hero-pause').innerHTML=paused?icon('play'):pauseIcon;$('.hero-pause').setAttribute('aria-label',paused?'Play cinematic showcase':'Pause cinematic showcase');$('.hero-pause').setAttribute('aria-pressed',String(paused));schedule();}
 async function show(index,manual=false){
  if(!games.length || index===active)return;const token=++sequence;stop();const game=games[index],url=safe(game.image);
  let image=null;if(url){const img=new Image();img.src=url;img.alt='';img.decoding='async';const loaded=await Promise.race([img.decode().then(()=>true).catch(()=>false),new Promise(r=>setTimeout(()=>r(false),2500))]);if(loaded)image=img;}
  if(token!==sequence||disposed)return;active=index;layer=1-layer;const next=root.querySelectorAll('.hero-scene')[layer];next.replaceChildren(...(image?[image]:[]));next.classList.add('is-active');root.querySelectorAll('.hero-scene')[1-layer].classList.remove('is-active');
  const date=releaseLabel(game);
  const copy=$('.hero-copy');
  copy.getAnimations({subtree:true}).forEach(a=>a.cancel());
  if(!motion.matches&&copy.querySelector('.hero-cta'))await copy.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-10px)'}],{duration:200,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{});
  if(token!==sequence||disposed)return;
  copy.getAnimations().forEach(a=>a.cancel());copy.innerHTML=copyMarkup(game,index);
  if(!motion.matches)[...copy.children].forEach((el,i)=>el.animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{duration:850,delay:i*65,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
  $('.hero-count').innerHTML=`<strong>${String(index+1).padStart(2,'0')}</strong><span>/ ${String(games.length).padStart(2,'0')} WORLDS TO WATCH</span>`;
  const upcoming=games[(index+1)%games.length];$('.hero-side').hidden=games.length<2;$('.hero-side').innerHTML=sideMarkup(index);$('.hero-next-art')?.addEventListener('error',e=>{e.target.hidden=true;},{once:true});$('.hero-next').onclick=()=>{setPause(true);show((active+1)%games.length,true);};
  root.querySelectorAll('.hero-chapter').forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===index));b.classList.toggle('is-current',i===index);});
  if(manual)$('.hero-announcement').textContent=`${index+1} of ${games.length}: ${game.title}. Releases ${date}.`;
  schedule();const preload=safe(upcoming.image);if(preload&&!motion.matches){const img=new Image();img.src=preload;}
 }
 async function refresh(force=false){
  if(fetching||(!force&&Date.now()-updated<600000))return;fetching=true;$('.hero-topline .eyebrow span').textContent='/ '+new Date().getUTCFullYear();
  try{
   const {data,error}=await client.functions.invoke('gaming-radar?kind=anticipated',{method:'GET'});if(error)throw error;
   const next=anticipatedShowcase(data?.items);if(!next.length){games=[];sizeStage();sequence++;active=-1;stop();root.querySelectorAll('.hero-scene').forEach(el=>{el.replaceChildren();el.classList.remove('is-active');});$('.hero-copy').innerHTML=`<p class="hero-kicker">THE NEXT CHAPTER AWAITS</p><h1>Great worlds.<br>Still to come<span>.</span></h1><p class="hero-description">No upcoming releases are listed for the rest of this year yet. Discover your next adventure below.</p>`;$('.hero-chapters').replaceChildren();$('.hero-side').hidden=true;$('.hero-pause').hidden=true;$('.hero-count').textContent='RELEASE RADAR';return;}
   updated=Date.now();$('.hero-source').innerHTML=`${data.stale?'Saved release data · ':''}Upcoming through December 31 · Ranked by <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer">RAWG</a> community interest · Dates may change`;
   if(JSON.stringify(games)===JSON.stringify(next))return;
   const selected=games[active]?.id;games=next;active=-1;sizeStage();
   $('.hero-chapters').innerHTML=games.map((g,i)=>`<button class="hero-chapter" aria-label="Show ${esc(g.title)}" aria-pressed="false" title="${esc(g.title)}"><span>${String(i+1).padStart(2,'0')}</span><span class="hero-chapter-line" aria-hidden="true"><i></i></span></button>`).join('');
   root.querySelectorAll('.hero-chapter').forEach((b,i)=>b.onclick=()=>{setPause(true);show(i,true);});$('.hero-pause').hidden=games.length<2;setPause(paused);await show(Math.max(0,games.findIndex(g=>g.id===selected)));
  }catch{if(!games.length){$('.hero-description').textContent='The release radar is temporarily unavailable. Your next adventure is waiting below.';$('.hero-copy').insertAdjacentHTML('beforeend','<button class="hero-retry">Try again</button>');$('.hero-retry').onclick=()=>{$('.hero-retry')?.remove();refresh(true);};}else $('.hero-source').textContent='Live release updates are temporarily unavailable. Showing the last loaded games.';}
  finally{fetching=false;}
 }
 $('.hero-pause').onclick=()=>setPause(!paused);
 root.addEventListener('pointerover',e=>{if(e.pointerType==='mouse'&&e.target.closest('a,button')){hover=true;schedule();}},{signal:events.signal});root.addEventListener('pointerout',e=>{if(hover&&!e.relatedTarget?.closest?.('#cinematic-hero a,#cinematic-hero button')){hover=false;schedule();}},{signal:events.signal});root.addEventListener('focusin',()=>{focused=true;schedule();},{signal:events.signal});root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget)){focused=false;schedule();}},{signal:events.signal});
 document.addEventListener('visibilitychange',()=>{schedule();if(!document.hidden)refresh();},{signal:events.signal});motion.addEventListener('change',()=>setPause(motion.matches),{signal:events.signal});
 let measuredWidth=0;
 const resizeObserver=new ResizeObserver(()=>{const width=root.getBoundingClientRect().width;if(width!==measuredWidth){measuredWidth=width;sizeStage();}});resizeObserver.observe(root);
 document.fonts.ready.then(sizeStage);document.fonts.addEventListener('loadingdone',sizeStage,{signal:events.signal});
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.15});observer.observe(root);const interval=setInterval(()=>{if(!document.hidden)refresh();},600000);refresh();
 return ()=>{disposed=true;sequence++;stop();clearInterval(interval);events.abort();observer.disconnect();resizeObserver.disconnect();};
}
