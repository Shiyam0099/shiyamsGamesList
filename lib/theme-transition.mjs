import smokeMask from '../assets/theme-smoke-mask.png';
// Decode the fixed texture before a user requests the first reveal.
const texture=new Image();texture.src=smokeMask;texture.decode().catch(()=>{});
// Isolated visual effect: remove this wrapper to restore instant theme changes.
let active=null,request=0;
export async function transitionTheme(button,apply){
 const id=++request;
 if(active){
  // Finish the pending theme update before interrupting its visual reveal.
  // Wait for cleanup so an older animation cannot erase the new one's mask.
  const previous=active;previous.commit();previous.stop();await previous.done;
 }
 if(id!==request)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(reduced.matches||!document.startViewTransition){apply();return;}
 const root=document.documentElement,box=button.getBoundingClientRect();
 const x=box.left+box.width/2,y=box.top+box.height/2;
 const radius=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y))+24;
 let finish;
 const state={transition:null,animations:[],done:new Promise(resolve=>{finish=resolve;})};active=state;
 let applied=false;
 const commit=()=>{if(!applied){apply();applied=true;}};
 const stop=()=>{state.transition?.skipTransition();state.animations.forEach(a=>a.cancel());};
 state.commit=commit;state.stop=stop;
 const preference=()=>{if(reduced.matches)stop();};
 root.classList.add('theme-transition');button.setAttribute('aria-busy','true');
 reduced.addEventListener('change',preference);
 window.addEventListener('resize',stop,{once:true});
 try{
  state.transition=document.startViewTransition(commit);
  // A hidden document or navigation can legitimately skip a snapshot.
  state.transition.updateCallbackDone.catch(()=>{});
  state.transition.finished.catch(()=>{});
  await state.transition.ready;
  // A feathered, displaced alpha mask reveals the actual new page through
  // rolling smoke. Only the mask is distorted, never the text or artwork.
  const smoke=CSS.supports('mask-image','radial-gradient(white,transparent)')&&'registerProperty' in CSS;
  let frames;
  if(smoke){
   root.style.setProperty('--theme-smoke-x',`${x}px`);
   root.style.setProperty('--theme-smoke-y',`${y}px`);
   root.classList.add('theme-smoke');
   frames=[{'--theme-smoke-size':'80px'},{'--theme-smoke-size':`${radius*4.6}px`}];
  }else{
   frames=[{clipPath:`circle(0px at ${x}px ${y}px)`},{clipPath:`circle(${radius}px at ${x}px ${y}px)`}];
  }
  state.animations.push(root.animate(frames,{pseudoElement:'::view-transition-new(root)',duration:1500,easing:'linear',fill:'both'}));
  // Fade the old snapshot using compositor-friendly opacity, without a full-page filter.
  state.animations.push(root.animate([
   {opacity:1},
   {opacity:.88}
  ],{pseudoElement:'::view-transition-old(root)',duration:1500,easing:'linear',fill:'both'}));
  await Promise.allSettled(state.animations.map(a=>a.finished));
 }catch{commit();}
 finally{
  stop();root.classList.remove('theme-transition','theme-smoke');root.style.removeProperty('--theme-smoke-x');root.style.removeProperty('--theme-smoke-y');button.removeAttribute('aria-busy');
  reduced.removeEventListener('change',preference);window.removeEventListener('resize',stop);
  if(active===state)active=null;
  finish();
 }
}
