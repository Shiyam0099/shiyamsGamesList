export const paletteOptions={
 dark:[{id:'original',name:'Original',description:'Forest charcoal & electric lime',swatches:['#111411','#cefa69','#f2f4eb']},{id:'crimson',name:'Crimson',description:'Near-black & blood-moon red',swatches:['#090304','#ff2828','#fff0ef']},{id:'neon-blue',name:'Neon Blue',description:'Midnight navy & electric blue',swatches:['#030716','#2495ff','#edf5ff']}],
 light:[{id:'sage',name:'Sage',description:'Soft porcelain & original sage',swatches:['#eef1eb','#3f684a','#ffffff']},{id:'gold',name:'Gold',description:'Pearl white & molten gold',swatches:['#ffffff','#ba8520','#ffe5a0']},{id:'purple',name:'Vibrant Purple',description:'Pure white & saturated violet',swatches:['#ffffff','#8226da','#d9b0fa']}]
};
export const defaultPalettes={dark_theme:'original',light_theme:'sage'};
export const paletteCacheKey='shiyams-site-palettes-v1';
export function validPalettes(value){return !!value&&paletteOptions.dark.some(p=>p.id===value.dark_theme)&&paletteOptions.light.some(p=>p.id===value.light_theme);}
let saved={...defaultPalettes},preview=false,generation=0;
export const savedPalettes=()=>({...saved});
export function applyPalettes(value){
 const next=validPalettes(value)?value:defaultPalettes;
 document.documentElement.dataset.darkPalette=next.dark_theme;
 document.documentElement.dataset.lightPalette=next.light_theme;
 window.dispatchEvent(new Event('site-palette-change'));
}
export function previewPalettes(value){preview=true;applyPalettes(value);}
export function endPalettePreview(){preview=false;applyPalettes(saved);}
export function acceptPalettes(value){
 if(!validPalettes(value))throw new Error('The saved theme choices could not be read.');
 saved={dark_theme:value.dark_theme,light_theme:value.light_theme};
 try{localStorage.setItem(paletteCacheKey,JSON.stringify(saved));}catch{/* Saving on the server still works without browser storage. */}
 if(!preview)applyPalettes(saved);
}
export async function readPalettes(client){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
 try{
  const {data,error}=await client.from('site_theme_settings').select('dark_theme,light_theme').eq('id',true).single().abortSignal(controller.signal);
  if(error||!validPalettes(data))throw new Error('Theme settings are unavailable. Check your connection and make sure the site theme database migration has been applied.');
  return data;
 }finally{clearTimeout(timer);}
}
export async function savePalettes(client,value){
 if(!validPalettes(value))throw new Error('Choose a valid theme for each mode.');
 ++generation; // An earlier public fetch must never overwrite a newer save.
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const {data,error}=await client.rpc('set_site_themes',{new_dark:value.dark_theme,new_light:value.light_theme}).abortSignal(controller.signal);
  if(controller.signal.aborted)throw new Error('Saving timed out. Reload to check the saved themes before trying again.');
  if(error)throw new Error('Could not save themes. Check your connection and active admin access, then try again.');
  acceptPalettes(Array.isArray(data)?data[0]:data);return savedPalettes();
 }finally{clearTimeout(timer);}
}
export function initSiteThemes(client){
 try{const cached=JSON.parse(localStorage.getItem(paletteCacheKey));if(validPalettes(cached))saved=cached;}catch{}
 applyPalettes(saved);
 let pending=false;
 async function refresh(){
  if(pending||document.hidden)return;
  pending=true;const version=++generation;
  try{const value=await readPalettes(client);if(version===generation)acceptPalettes(value);}catch{/* Keep defaults or the last saved theme when offline. */}
  finally{pending=false;}
 }
 void refresh();
 window.addEventListener('focus',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
 window.addEventListener('storage',event=>{
  if(event.key!==paletteCacheKey)return;
  try{const next=JSON.parse(event.newValue);if(validPalettes(next)){++generation;saved=next;if(!preview)applyPalettes(saved);}}catch{}
 });
}
