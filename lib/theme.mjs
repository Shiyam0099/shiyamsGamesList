import {playThemeSound,themeSoundEnabled,setThemeSound} from './theme-sound.mjs';
import {transitionTheme} from './theme-transition.mjs';
import './theme.css';
const key='shiyams-theme';
const sun='<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
const moon='<path d="M20.5 13A9 9 0 0 1 11 3.5 9 9 0 1 0 20.5 13Z"/>';
let theme=document.documentElement.dataset.theme==='light'?'light':'dark';
let requestedTheme=theme;
function paint(button,value=theme){
 const label=value==='dark'?'Switch to light mode':'Switch to dark mode';
 if(button.getAttribute('aria-label')===label)return;
 button.setAttribute('aria-label',label);button.title=label;
 button.dataset.mode=value;
 if(!button.querySelector('.theme-switch-track')){
  const glyph=path=>`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">${path}</svg>`;
  button.innerHTML=`<span class="theme-switch-track" aria-hidden="true"><span class="theme-switch-thumb"></span><span class="theme-switch-slot theme-switch-moon">${glyph(moon)}</span><span class="theme-switch-slot theme-switch-sun">${glyph(sun)}</span></span><span class="member-control-tooltip" aria-hidden="true"></span>`;
 }
 button.querySelector('.member-control-tooltip').textContent=label;
}
function mount(){
 const button=document.createElement('button');
 button.type='button';button.className='theme-toggle floating-theme-toggle';
 paint(button);document.body.append(button);
 const sound=document.createElement('button');sound.type='button';sound.className='theme-sound-toggle';
 document.body.append(sound);paintSound();
}
function paintSound(){
 const button=document.querySelector('.theme-sound-toggle');if(!button)return;
 const enabled=themeSoundEnabled(),label=enabled?'Mute theme sounds':'Enable theme sounds';
 button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(enabled));
 button.innerHTML=`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/>${enabled?'<path d="M15 8q5 4 0 8m3-11q8 7 0 14"/>':'<path d="m16 9 5 6m0-6-5 6"/>'}</svg>`;
}
function apply(value,persist=false){
 theme=value==='light'?'light':'dark';document.documentElement.dataset.theme=theme;
 document.documentElement.style.colorScheme=theme;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='light'?'#f4f6ef':'#111411');
 if(persist)try{localStorage.setItem(key,theme);}catch{/* Session theme still works when storage is unavailable. */}
 document.querySelectorAll('.theme-toggle').forEach(button=>paint(button));
}
document.addEventListener('click',event=>{
 let button=event.target.closest('.theme-toggle,.theme-sound-toggle');
 // View-transition snapshots retarget pointer clicks to the document root.
 // Resolve only clicks inside the switch's visible bounds during a reveal.
 if(!button&&event.detail>0&&document.documentElement.classList.contains('theme-transition')){
  for(const control of document.querySelectorAll('.floating-theme-toggle,.theme-sound-toggle')){
   const rect=control.getBoundingClientRect();
   if(event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom){button=control;break;}
  }
 }
 if(!button)return;
 if(button.matches('.theme-sound-toggle')){setThemeSound(!themeSoundEnabled());paintSound();return;}
 requestedTheme=requestedTheme==='dark'?'light':'dark';
 const target=requestedTheme;
 // Give immediate feedback, even while the browser prepares its snapshot.
 paint(button,target);
 playThemeSound(target);
 transitionTheme(button,()=>apply(target,true));
});
window.addEventListener('storage',event=>{if(event.key===key||event.key===null){requestedTheme=event.newValue==='light'?'light':'dark';apply(requestedTheme);}});
apply(theme);mount();

window.addEventListener('storage',event=>{if(event.key==='shiyams-theme-sound'||event.key===null){setThemeSound(event.newValue!=='off',false);paintSound();}});
