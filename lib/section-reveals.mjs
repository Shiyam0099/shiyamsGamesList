// Observe only bounded sections/cards, never an entire long results list.
export const discoverySections='.editorial-intro,.radar-tabs,.library-links,.editorial-tabs,.calendar-controls,.editorial-toolbar,.radar-card,.article-card,.calendar-date,.editorial-empty,.editorial-attribution';
export const homeSections='.intro,.stats,.dashboard-panel,#currently-playing,#recommendations,#collection>.section-heading,#about';
export function revealSections(root,selector){
 if(!root||!window.IntersectionObserver)return {refresh(){},dispose(){}};
 const preference=matchMedia('(prefers-reduced-motion: reduce)'),targets=new Set(),animations=new Map();
 let revealed=new WeakSet(),disposed=false;
 const rearm=new IntersectionObserver(entries=>{
  for(const {target,isIntersecting} of entries)if(!isIntersecting)revealed.delete(target);
 },{rootMargin:'80px 0px'});
 const observer=new IntersectionObserver(entries=>{
  if(preference.matches||document.hidden)return;
  for(const {target,isIntersecting,intersectionRatio} of entries){
   if(!isIntersecting||intersectionRatio<.08||revealed.has(target))continue;
   revealed.add(target);
   animations.get(target)?.cancel();
   const animation=target.animate([
    {opacity:.22,transform:'translateY(24px)'},
    {opacity:1,transform:'translateY(0)'}
   ],{duration:1000,easing:'cubic-bezier(.22,.61,.36,1)',fill:'backwards'});
   animations.set(target,animation);
   animation.finished.catch(()=>{}).finally(()=>{if(animations.get(target)===animation)animations.delete(target);});
  }
 },{threshold:.08,rootMargin:'0px 0px -24px 0px'});
 function refresh(){
  if(disposed)return;
  for(const target of targets)if(!root.contains(target)){
   observer.unobserve(target);rearm.unobserve(target);animations.get(target)?.cancel();animations.delete(target);targets.delete(target);
  }
  root.querySelectorAll(selector).forEach(target=>{
   if(targets.has(target))return;
   targets.add(target);observer.observe(target);rearm.observe(target);
  });
 }
 function settle(){animations.forEach(animation=>animation.cancel());animations.clear();}
 function onPreference(){
  settle();revealed=new WeakSet();observer.disconnect();
  if(!preference.matches)targets.forEach(target=>observer.observe(target));
 }
 function onVisibility(){if(document.hidden)settle();}
 preference.addEventListener('change',onPreference);
 document.addEventListener('visibilitychange',onVisibility);
 refresh();
 return {refresh,dispose(){disposed=true;observer.disconnect();rearm.disconnect();settle();targets.clear();preference.removeEventListener('change',onPreference);document.removeEventListener('visibilitychange',onVisibility);}};
}
