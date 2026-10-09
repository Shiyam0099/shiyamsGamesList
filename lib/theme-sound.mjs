// Local recordings are loaded only after a theme-button action.
const key='shiyams-theme-sound';
// Match these recordings' perceived levels; skip the howl's silent lead-in.
const clips={dark:{volume:.65,start:.42},light:{volume:.35,start:0}};
let enabled=true,voice;
try{enabled=localStorage.getItem(key)!=='off';}catch{}
export const themeSoundEnabled=()=>enabled;
export function stopThemeSound(){
 const previous=voice;voice=null;
 if(!previous)return;
 previous.pause();
 try{previous.currentTime=0;}catch{}
}
export function setThemeSound(value,persist=true){
 enabled=Boolean(value);if(!enabled)stopThemeSound();
 if(persist)try{localStorage.setItem(key,enabled?'on':'off');}catch{}
}
export async function playThemeSound(theme){
 stopThemeSound();if(!enabled||document.hidden)return;
 let current;
 try{
  // Vite's base includes the GitHub Pages project path in production.
  const mode=theme==='dark'?'dark':'light',clip=clips[mode];
  current=new Audio(`${import.meta.env.BASE_URL}audio/${mode}-mode.mp3`);
  current.volume=clip.volume;current.currentTime=clip.start;current.loop=false;voice=current;
  const release=()=>{if(voice===current)voice=null;};
  current.addEventListener('ended',release,{once:true});
  current.addEventListener('error',release,{once:true});
  // Start within the click gesture, including the first uncached playback.
  await current.play();
 }catch{
  // A stale play rejection must not stop a newer click's recording.
  if(voice===current)stopThemeSound();
 }
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopThemeSound();});
window.addEventListener('pagehide',stopThemeSound);
