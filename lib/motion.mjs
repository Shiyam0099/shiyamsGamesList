import './motion.css';
const animations=new WeakMap();
export function animateContent(element){
 if(!element)return;
 animations.get(element)?.cancel();
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||!element.animate)return;
 const animation=element.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'});
 animations.set(element,animation);
}
const visited=new WeakSet();
export function pageReady(root){if(root&&!visited.has(root)){visited.add(root);animateContent(root.querySelector('main'));}}

// Keep tab updates synchronous; animate only visible cards rather than the entire library.
const collectionAnimations=new WeakMap();
export function animateCollection(grid,direction=1){
 collectionAnimations.get(grid)?.forEach(animation=>animation.cancel());
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||!grid.animate)return;
 const visible=[];
 for(const card of grid.children){
  const box=card.getBoundingClientRect();
  if(box.top>=innerHeight||visible.length===16)break;
  if(box.bottom>0)visible.push(card);
 }
 const running=[];
 visible.forEach((card,i)=>running.push(card.animate([
  {opacity:0,transform:`translate(${direction*18}px, 24px)`},
  {opacity:1,transform:'translate(0, 0)'}
 ],{duration:1000,delay:Math.min(i*35,140),easing:'cubic-bezier(.22,.61,.36,1)',fill:'backwards'})));
 collectionAnimations.set(grid,running);
}

export function animateTabSelection(tabs){
 const track=document.createElement('div'),indicator=document.createElement('div');
 track.className='tab-indicator-track';track.setAttribute('aria-hidden','true');
 indicator.className='tab-indicator';track.append(indicator);tabs.append(track);
 let frame;
 function update(){
  if(!tabs.isConnected){resize.disconnect();selection.disconnect();cancelAnimationFrame(frame);return;}
  const active=tabs.querySelector('[role="tab"][aria-selected="true"]');
  if(!active?.offsetWidth)return;
  const width=active.offsetWidth,left=active.offsetLeft;
  indicator.style.transform=`translateX(${left}px) scaleX(${width})`;
  if(!tabs.hasAttribute('data-indicator-ready')){
   cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>tabs.setAttribute('data-indicator-ready',''));
  }
 }
 const resize=new ResizeObserver(update),selection=new MutationObserver(update);
 resize.observe(tabs);
 tabs.querySelectorAll('[role="tab"]').forEach(button=>resize.observe(button));
 selection.observe(tabs,{subtree:true,attributes:true,attributeFilter:['aria-selected']});
 update();
}
