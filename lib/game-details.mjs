import './game-details.css';
import {videoID} from './game-data.mjs';
import {icon} from './ui.mjs';
let apiPromise;
function youtubeAPI(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(apiPromise)return apiPromise;
 apiPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script'),previous=window.onYouTubeIframeAPIReady;
  const timer=setTimeout(()=>{script.remove();reject(new Error('Player unavailable'));},8000);
  window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);resolve(window.YT);previous?.();};
  script.src='https://www.youtube.com/iframe_api';script.async=true;
  script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('Player unavailable'));};
  document.head.append(script);
 }).catch(error=>{apiPromise=null;throw error;});
 return apiPromise;
}
const idFor=value=>{try{return videoID(value);}catch{return '';}};
export function mountGameMedia(dialog,game,placeholder){
 const $=selector=>dialog.querySelector(selector),slot=$('#video-slot'),fallback=$('#detail-fallback');
 const status=$('#detail-media-status'),play=$('#detail-play'),sound=$('#detail-sound'),external=$('#detail-external');
 const preference=matchMedia('(prefers-reduced-motion: reduce)'),ids={trailer:idFor(game.videoId),critic:idFor(game.criticVideoUrl)};
 let mode='trailer',player,version=0,closed=false,playing=false,muted=true,watchdog;
 const art=$('#detail-backdrop');art.src=game.poster||placeholder;art.onerror=()=>{art.onerror=null;art.src=placeholder;};
 const label=()=>mode==='trailer'?'Trailer':'Critic review';
 const valid=token=>!closed&&token===version;
 function paint(){
  play.innerHTML=icon(playing?'pause':'play')+(playing?'Pause':'Play '+label().toLowerCase());
  sound.textContent=muted?'Enable sound':'Mute sound';sound.setAttribute('aria-pressed',String(!muted));
 }
 function clearPlayer(){clearTimeout(watchdog);const old=player;player=null;try{old?.destroy();}catch{}slot.replaceChildren();playing=false;}
 function showFallback(reason='missing'){
  clearPlayer();fallback.hidden=false;slot.hidden=true;sound.disabled=true;
  const missing=!ids[mode];play.disabled=missing;paint();
  const title=reason==='ready'?'Your front-row seat.':missing?(mode==='trailer'?'A world worth imagining.':'Your verdict comes first.'):'The screen is taking a break.';
  $('#detail-fallback-title').textContent=title;
  $('#detail-fallback-copy').textContent=reason==='ready'?'Press play when you’re ready to step inside.':missing?(mode==='trailer'?'No trailer has been added yet. Explore the artwork and story below.':'No playable critic video has been added yet. Explore the game, or discover a review on YouTube.'):'This video couldn’t play here. Try again or open it on YouTube.';
  status.textContent=reason==='ready'?'Ready when you are':missing?label()+' not available':label()+' unavailable';
 }
 function updateSource(){
  external.href=ids[mode]?`https://www.youtube.com/watch?v=${ids[mode]}`:`https://www.youtube.com/results?search_query=${encodeURIComponent(game.title+(mode==='critic'?' review':' official trailer'))}`;
  external.innerHTML=(ids[mode]?'Open on YouTube':'Find '+(mode==='critic'?'reviews':'trailers'))+' '+icon('external');
  dialog.querySelectorAll('[data-detail-media]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.detailMedia===mode));});
 }
 async function start(automatic=false){
  const token=++version;clearPlayer();updateSource();
  if(!ids[mode]){showFallback();return;}
  muted=automatic;paint();play.disabled=false;sound.disabled=true;
  status.textContent='Opening '+label().toLowerCase()+'…';fallback.hidden=true;slot.hidden=false;
  const iframe=document.createElement('iframe'),params=new URLSearchParams({autoplay:'1',mute:muted?'1':'0',playsinline:'1',rel:'0',enablejsapi:'1',origin:location.origin,controls:automatic?'0':'1'});
  if(mode==='trailer'){params.set('loop','1');params.set('playlist',ids[mode]);}
  iframe.src=`https://www.youtube-nocookie.com/embed/${ids[mode]}?${params}`;
  iframe.title=game.title+' '+label().toLowerCase();iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';slot.append(iframe);
  const fail=()=>{if(valid(token)){version++;showFallback('error');}};
  iframe.addEventListener('error',fail,{once:true});watchdog=setTimeout(fail,15000);
  try{
   const YT=await youtubeAPI();if(!valid(token))return;
   player=new YT.Player(iframe,{events:{
    onReady:event=>{if(!valid(token))return;clearTimeout(watchdog);player=event.target;sound.disabled=false;muted?player.mute():player.unMute();player.playVideo();},
    onStateChange:event=>{if(!valid(token))return;playing=event.data===1;if(playing)clearTimeout(watchdog);status.textContent=label()+(playing?(muted?' · Playing silently':' · Playing'):event.data===3?' · Buffering':event.data===0?' · Finished':' · Paused');paint();},
    onAutoplayBlocked:()=>{if(!valid(token))return;clearTimeout(watchdog);playing=false;status.textContent='Press play to start '+label().toLowerCase();paint();},
    onError:fail
   }});
  }catch{fail();}
 }
 function select(next){version++;mode=next;clearPlayer();updateSource();if(!ids[mode])showFallback();else start(false);dialog.scrollTo({top:0,behavior:preference.matches?'instant':'smooth'});}
 dialog.querySelectorAll('[data-detail-media]').forEach(button=>button.onclick=()=>select(button.dataset.detailMedia));
 play.onclick=()=>{if(!ids[mode])return;if(player){if(playing)player.pauseVideo();else player.playVideo();}else start(false);};
 sound.onclick=()=>{if(!player)return;muted=!muted;muted?player.mute():player.unMute();paint();status.textContent=label()+(playing?(muted?' · Playing silently':' · Playing'):' · Paused');};
 function pause(){if(player)player.pauseVideo();else{version++;showFallback(ids[mode]?'ready':'missing');}}
 const visibility=()=>{if(document.hidden)pause();},onPreference=()=>{if(preference.matches)pause();};
 document.addEventListener('visibilitychange',visibility);preference.addEventListener('change',onPreference);
 updateSource();if(ids.trailer&&!preference.matches)start(true);else showFallback(ids.trailer?'ready':'missing');
 return ()=>{closed=true;version++;clearPlayer();document.removeEventListener('visibilitychange',visibility);preference.removeEventListener('change',onPreference);};
}
