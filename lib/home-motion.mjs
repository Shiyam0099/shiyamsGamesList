import {revealSections,homeSections} from './section-reveals.mjs';
import './home-motion.css';
let dispose;

// Reveal on entry without hiding content while it waits offscreen. Rebuilding
// the collection releases observers and animations attached to the old view.
export function animateHome(root){
 dispose?.();
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 if(!root || !window.IntersectionObserver || preference.matches)return;
 const seen=new WeakSet(),running=new Set(),pending=new Set(),counters=new Map();
 const sections=homeSections,sectionReveals=revealSections(root,sections);
 let counterFrame=0;
 function tickCounters(now){
  counterFrame=0;
  for(const [element,state] of counters){
   if(!element.isConnected){state.finish();continue;}
   if(now<state.start)continue;
   const progress=Math.min(1,(now-state.start)/1200);
   const next=(state.value*(1-Math.pow(1-progress,3))).toFixed(state.precision)+state.suffix;
   if(state.visual.textContent!==next)state.visual.textContent=next;
   if(progress===1)state.finish();
  }
  if(counters.size)counterFrame=requestAnimationFrame(tickCounters);
 }
 function countUp(element,delay){
  if(!element)return;
  const final=element.textContent.trim(),match=final.match(/^(\d+)(?:\.(\d+))?(%)?$/);
  if(!match)return;
  const value=parseFloat(final),precision=match[2]?.length||0,suffix=match[3]||'';
  // The real value remains accessible and reserves its final width throughout.
  const original=document.createElement('span'),visual=document.createElement('span');
  original.className='count-final';original.textContent=final;
  visual.className='count-ticker';visual.setAttribute('aria-hidden','true');
  visual.textContent=(0).toFixed(precision)+suffix;
  element.replaceChildren(original,visual);element.classList.add('is-counting');
  const state={visual,value,precision,suffix,start:performance.now()+delay,finish:()=>{element.textContent=final;element.classList.remove('is-counting');counters.delete(element);}};
  counters.set(element,state);
  if(!counterFrame)counterFrame=requestAnimationFrame(tickCounters);
 }
 function play(element,frames,delay=0,duration=650){
  if(!element.animate)return;
  const animation=element.animate(frames,{duration,delay,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
  running.add(animation);
  animation.finished.catch(()=>{}).finally(()=>running.delete(animation));
  return animation;
 }
 const observer=new IntersectionObserver(entries=>{
  let stagger=0;
  for(const {target,isIntersecting} of entries){
   if(!isIntersecting)continue;
   observer.unobserve(target);pending.delete(target);
   const delay=Math.min(stagger*35,105);
   if(target.matches('.stat,.rate'))countUp(target.querySelector('strong'),0);
   // Tab changes already animate visible cards through animateCollection.
   if(target.getAnimations().length)continue;
   if(target.matches('.library-bar')){
    play(target,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],0,1000);
   }else if(target.matches('.age-track')){
    const fill=target.firstElementChild;
    if(fill)play(fill,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],delay,950);
   }else{
    const parent=target.parentElement.closest(sections);
    if(parent)continue;
    stagger++;
    play(target,[{opacity:.15,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],delay);
   }
  }
 },{threshold:0,rootMargin:'0px 0px 48px 0px'});
 function observe(scope=root){
  scope.querySelectorAll('.stat,.rate,.library-bar,.age-track,.playing-card,#grid .card').forEach(element=>{
   if(!seen.has(element)){seen.add(element);pending.add(element);observer.observe(element);}
  });
 }
 const grid=root.querySelector('#grid');
 const gridUpdates=new MutationObserver(()=>{
  for(const element of pending)if(!element.isConnected){observer.unobserve(element);pending.delete(element);}
  observe(grid);
 });
 if(grid)gridUpdates.observe(grid,{childList:true});
 observe();
 function settle(){cancelAnimationFrame(counterFrame);counterFrame=0;counters.forEach(state=>state.finish());running.forEach(a=>a.cancel());running.clear();}
 function onVisibility(){if(document.hidden)settle();}
 dispose=()=>{observer.disconnect();sectionReveals.dispose();gridUpdates.disconnect();pending.clear();settle();preference.removeEventListener('change',onPreference);document.removeEventListener('visibilitychange',onVisibility);};
 function onPreference(){if(preference.matches)dispose?.();}
 preference.addEventListener('change',onPreference);
 document.addEventListener('visibilitychange',onVisibility);
}
