import './collection-experience.css';
const palettes=new Map(),requests=new WeakMap();
const fallback='206 250 105';
export function artworkAccent(element,url){
 const request={};requests.set(element,request);element.style.setProperty('--art-accent',fallback);
 if(!url||!/^https?:/.test(url))return;
 if(!palettes.has(url)){
  if(palettes.size>=80)palettes.delete(palettes.keys().next().value);
  palettes.set(url,new Promise(resolve=>{
   const image=new Image();image.crossOrigin='anonymous';
   let done=false;const finish=color=>{if(done)return;done=true;clearTimeout(timer);image.onload=image.onerror=null;resolve(color);};
   const timer=setTimeout(()=>finish(fallback),5000);
   image.onerror=()=>finish(fallback);
   image.onload=()=>{try{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=24;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,24,24);
    const pixels=ctx.getImageData(0,0,24,24).data;let total=0,r=0,g=0,b=0;
    for(let i=0;i<pixels.length;i+=4){const max=Math.max(...pixels.slice(i,i+3)),min=Math.min(...pixels.slice(i,i+3));if(max<40||min>225||pixels[i+3]<200)continue;const weight=1+(max-min)/50;r+=pixels[i]*weight;g+=pixels[i+1]*weight;b+=pixels[i+2]*weight;total+=weight;}
    if(!total)return finish(fallback);
    const rgb=[r,g,b].map(v=>v/total),lift=Math.max(1,175/Math.max(...rgb));finish(rgb.map(v=>Math.round(Math.max(125,Math.min(235,v*lift)))).join(' '));
   }catch{finish(fallback);}};
   image.src=url;
  }));
 }
 palettes.get(url).then(color=>{if(element.isConnected&&requests.get(element)===request)element.style.setProperty('--art-accent',color);});
}
export function expandDetails(dialog,source){
 dialog.getAnimations().forEach(animation=>animation.cancel());
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const target=dialog.getBoundingClientRect(),mobile=matchMedia('(max-width:600px)').matches;
 const from=source?.getBoundingClientRect();
 const transform=mobile?'translateY(70px)':from&&from.width?`translate(${from.x+from.width/2-target.x-target.width/2}px,${from.y+from.height/2-target.y-target.height/2}px) scale(${Math.max(.2,Math.min(.65,from.width/target.width))})`:'translateY(24px) scale(.95)';
 dialog.animate([{opacity:.15,transform},{opacity:1,transform:'none'}],{duration:mobile?380:460,easing:'cubic-bezier(.16,1,.3,1)'});
}

let disposeShortcut;
export function collectionShortcut(root){
 disposeShortcut?.();
 const heading=root.querySelector('#collection-title'),collection=root.querySelector('#collection');
 if(!heading||!collection)return;
 const button=document.createElement('button');
 button.type='button';button.className='collection-shortcut';button.hidden=true;
 button.setAttribute('aria-label','Back to The collection and filters');
 button.innerHTML='<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg><span>The collection</span>';
 root.append(button);
 const update=()=>{button.hidden=heading.getBoundingClientRect().bottom>0||root.hidden;};
 let frame;
 const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;update();});};
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule);schedule();
 button.onclick=()=>{
  heading.focus({preventScroll:true});
  collection.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 };
 disposeShortcut=()=>{window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);cancelAnimationFrame(frame);button.remove();};
}
