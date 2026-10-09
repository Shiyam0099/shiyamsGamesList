let dispose;

export function revealRecommendation(panel,{spin=false,animate=true}={}){
 dispose?.();
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 if(!animate||preference.matches||!panel.animate)return;
 const animations=new Set();
 let cancelled=false;
 const artwork=panel.querySelector('#rec-image');
 function play(element,frames,duration,delay=0){
  if(!element||cancelled)return;
  const animation=element.animate(frames,{duration,delay,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
  animations.add(animation);
  animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));
 }
 const info=panel.querySelector('#rec-info');
 [...info.children].forEach((element,index)=>play(element,[
  {opacity:0,transform:'translateY(16px)'},
  {opacity:1,transform:'translateY(0)'}
 ],650,index*65));
 play(panel,[{borderColor:'#cefa6970'},{borderColor:getComputedStyle(panel).borderColor}],950);
 if(spin){
  const button=panel.querySelector('#next-rec');
  play(button.querySelector('.ui-icon'),[{transform:'rotate(-30deg)'},{transform:'rotate(720deg)'}],850);
  play(button,[{transform:'scale(.96)'},{transform:'scale(1.025)',offset:.35},{transform:'scale(1)'}],550);
 }
 function revealArtwork(){
  if(cancelled||!artwork?.isConnected||artwork.hidden||!artwork.getAttribute('src'))return;
  play(artwork,[{opacity:.15,transform:'translateX(24px) scale(1.04)'},
   {opacity:1,transform:'translateX(0) scale(1)'}],850);
 }
 // A slow cover gets its reveal when it is ready, rather than animating a blank image.
 if(artwork?.complete)revealArtwork();else artwork?.addEventListener('load',revealArtwork,{once:true});
 const cleanup=()=>{
  cancelled=true;animations.forEach(animation=>animation.cancel());animations.clear();
  artwork?.removeEventListener('load',revealArtwork);
  preference.removeEventListener('change',onPreference);
 };
 function onPreference(){if(preference.matches)cleanup();}
 preference.addEventListener('change',onPreference);
 dispose=cleanup;
}
