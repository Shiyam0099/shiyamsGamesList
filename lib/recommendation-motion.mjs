import './recommendation-motion.css';

let dispose;
let isRevealing=()=>false;

export function revealRecommendation(panel,{spin=false,animate=true,restart=true}={}){
 // A scroll reveal must not cancel a spin that just started in the same frame.
 if(!restart&&isRevealing())return;
 dispose?.();
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 if(!animate||preference.matches||!panel.animate)return;
 const animations=new Set();
 isRevealing=()=>animations.size>0;
 let cancelled=false;
 const artwork=panel.querySelector('#rec-image');
 function play(element,frames,duration,delay=0){
  if(!element||cancelled)return;
  const animation=element.animate(frames,{duration,delay,easing:'cubic-bezier(.22,.61,.36,1)',fill:'backwards'});
  animations.add(animation);
  animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));
 }
 const info=panel.querySelector('#rec-info');
 [...info.children].forEach((element,index)=>play(element,[
  {opacity:0,transform:spin?'translateY(30px) skewX(-3deg)':'translateY(24px)'},
  {opacity:1,transform:'translateY(0)'}
 ],1000,(spin?180:0)+index*80));
 const surface=getComputedStyle(panel);
 play(panel,[{borderColor:surface.getPropertyValue('--rec-reveal-border').trim()||'#cefa6970'},{borderColor:surface.borderColor}],950);
 if(spin){
  const button=panel.querySelector('#next-rec');
  play(button.querySelector('.ui-icon'),[{transform:'rotate(-45deg) scale(.8)'},{transform:'rotate(540deg) scale(1.15)',offset:.55},{transform:'rotate(1080deg) scale(1)'}],1350);
  play(button,[{transform:'scale(.94)'},{transform:'scale(1.035)',offset:.3},{transform:'scale(1)'}],650);
  play(button.querySelector('.rec-charge'),[{opacity:.55,transform:'scaleX(0)'},{opacity:.55,transform:'scaleX(1)',offset:.8},{opacity:0,transform:'scaleX(1)'}],1350);
 }
 function revealArtwork(){
  if(cancelled||!artwork?.isConnected||artwork.hidden||!artwork.getAttribute('src'))return;
  play(artwork,spin?[
   {opacity:0,transform:'translateX(55px) scale(1.18)'},
   {opacity:1,transform:'translateX(0) scale(1.04)',offset:.6},
   {opacity:1,transform:'translateX(0) scale(1)'}
  ]:[{opacity:0,transform:'translateX(32px) scale(1.06)'},
   {opacity:1,transform:'translateX(0) scale(1)'}],spin?1500:1100);
  if(spin){
   play(panel.querySelector('.rec-scan'),[{opacity:0,transform:'translateX(-120%) skewX(-12deg)'},{opacity:.8,offset:.25},{opacity:0,transform:'translateX(460%) skewX(-12deg)'}],1250);
   play(panel.querySelector('.rec-lock'),[{opacity:0,transform:'scale(1.14)'},{opacity:.65,transform:'scale(1)',offset:.55},{opacity:0,transform:'scale(1)'}],1500);
  }
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
