import {paletteOptions,defaultPalettes,readPalettes,acceptPalettes,savedPalettes,previewPalettes,endPalettePreview,savePalettes} from '../lib/site-themes.mjs';
import {setThemeMode} from '../lib/theme.mjs';
import {icon} from '../lib/ui.mjs';
import './themes.css';

export async function themesPage(client){
 let initial,error='';
 try{initial=await readPalettes(client);acceptPalettes(initial);}catch(e){initial=savedPalettes();error=e.message;}
 const group=mode=>`<fieldset class="palette-group"><legend><span class="palette-mode-icon">${icon(mode==='dark'?'game':'star')}</span><span>${mode==='dark'?'After dark':'Into the light'}<small>${mode==='dark'?'DARK MODE':'LIGHT MODE'} · CHOOSE YOUR ATMOSPHERE</small></span></legend><div class="palette-options">${paletteOptions[mode].map((p,i)=>`<div class="palette-option" data-palette="${p.id}"><label><input type="radio" name="${mode}_theme" value="${p.id}" aria-label="${p.name} ${mode} theme" ${initial[mode+'_theme']===p.id?'checked':''}><span class="palette-swatch palette-scene" aria-hidden="true" style="--preview-bg:${p.swatches[0]};--preview-accent:${p.swatches[1]};--preview-ink:${p.swatches[2]}"><span class="palette-scene-orb"></span><span class="palette-scene-beam"></span><span class="palette-scene-grid"></span><span class="palette-scene-hud"><span>PLAYER / ${String(i+1).padStart(2,'0')}</span>${icon('game')}</span><span class="palette-scene-caption">${{original:'THE ORIGINAL SAVE',crimson:'BLOOD MOON', 'neon-blue':'NEON HORIZON',sage:'QUIET QUEST',gold:'GOLDEN HOUR',purple:'VIOLET REALM'}[p.id]}</span><span class="palette-scene-meter"><i></i><i></i><i></i><i></i><i></i></span></span><span class="palette-card-title"><strong>${p.name}</strong><span class="palette-equipped">${icon('status')} Selected</span></span><small>${p.description}</small></label><button type="button" data-preview-mode="${mode}" data-preview-palette="${p.id}">${icon('play')}<span>Preview ${p.name}</span>${icon('chevronRight')}</button></div>`).join('')}</div></fieldset>`;
 // Error text is authored locally; no backend HTML is interpolated.
 return {html:`<form id="site-themes-form" class="admin-panel theme-settings"><div class="theme-studio-heading"><div><p class="eyebrow">PERSONALIZE THE EXPERIENCE</p><h2>Choose your atmosphere.</h2></div><span class="theme-studio-badge">${icon('game')} THEME STUDIO</span></div><p>Choose one palette for each mode. Saved choices apply across the website for everyone; visitors still choose whether to use dark or light mode.</p>${error?`<p role="alert" class="admin-notice error">${error} You can still preview the palettes here.</p><button type="button" id="retry-themes">Retry loading themes</button>`:''}${group('dark')}${group('light')}<p id="theme-preview-status" role="status">Preview a palette here before saving it for visitors.</p><p class="admin-notice" id="theme-save-status" role="status" aria-live="polite"></p><div class="admin-actions theme-studio-actions"><button class="primary" ${error?'disabled':''}>${icon('status')} Save site themes</button><button type="button" id="reset-palettes">Use original colors</button><button type="button" id="cancel-palette-preview">End preview</button></div></form>`,bind(){
  const form=document.querySelector('#site-themes-form'),status=form.querySelector('#theme-save-status'),previewStatus=form.querySelector('#theme-preview-status');
  const originalMode=document.documentElement.dataset.theme;
  let alive=true,busy=false;
  const value=()=>Object.fromEntries(new FormData(form));
  const paint=()=>previewPalettes(value());
  form.querySelectorAll('[data-preview-mode]').forEach(button=>button.onclick=()=>{
   const mode=button.dataset.previewMode,id=button.dataset.previewPalette;
   form.querySelector(`input[name="${mode}_theme"][value="${id}"]`).checked=true;
   paint();setThemeMode(mode);previewStatus.textContent=`Previewing ${paletteOptions[mode].find(p=>p.id===id).name} in ${mode} mode. Visitors’ themes have not changed.`;
  });
  form.onchange=()=>{paint();status.textContent='Unsaved changes.';status.classList.remove('error');};
  form.querySelector('#cancel-palette-preview').onclick=()=>{endPalettePreview();setThemeMode(originalMode);previewStatus.textContent='Preview ended. Your selections remain ready to save.';};
  form.querySelector('#reset-palettes').onclick=()=>{
   for(const [name,id] of Object.entries(defaultPalettes))form.querySelector(`input[name="${name}"][value="${id}"]`).checked=true;
   paint();status.textContent='Original colors selected. Save to apply them for visitors.';
  };
  form.querySelector('#retry-themes')?.addEventListener('click',()=>location.reload());
  form.onsubmit=async event=>{
   event.preventDefault();if(busy||error)return;busy=true;
   const selection=value(),controls=[...form.querySelectorAll('input,button')];controls.forEach(el=>el.disabled=true);
   form.dataset.busy='true';form.setAttribute('aria-busy','true');
   status.classList.remove('error');status.textContent='Saving site themes…';
   try{await savePalettes(client,selection);if(!alive)return;endPalettePreview();status.textContent='Themes saved. Visitors will see them when opening or returning to the website.';previewStatus.textContent='Saved palettes are now active.';}
   catch(e){if(alive){status.classList.add('error');status.textContent=e.message;}}
   finally{busy=false;delete form.dataset.busy;form.removeAttribute('aria-busy');if(alive)controls.forEach(el=>el.disabled=false);}
  };
  return ()=>{alive=false;endPalettePreview();setThemeMode(originalMode);};
 }};
}
