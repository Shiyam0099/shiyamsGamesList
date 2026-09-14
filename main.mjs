import {applyBrand} from './lib/branding.mjs';
import {pageReady} from './lib/motion.mjs';
import {loader,observeFields} from './lib/ui.mjs';
import './game-logic.js';
import {localPath,normalizeLinks} from './lib/routes.mjs';
import {initPublic} from './app.js';
import {getSupabase} from './lib/supabase.mjs';
import {gameService} from './lib/game-data.mjs';
import {startCinematicHero} from './lib/cinematic-hero.mjs';
const loading=document.querySelector('#load-state');
const publicRoot=document.querySelector('#public-app');
loading.innerHTML=loader();
observeFields();
normalizeLinks(publicRoot);
applyBrand(publicRoot);
async function start(){
  try {
    const client=getSupabase();
    if(/^\/admin(?:\/|$)/.test(localPath())) {
      const {startAdmin}=await import('./admin/admin.mjs');
      loading.hidden=true; document.querySelector('#admin-app').hidden=false;
      await startAdmin(client); return;
    }
    const editorialKind=localPath().replace(/\/$/,'').slice(1);
    if(['top250','calendar'].includes(editorialKind)){const {startLibrary}=await import('./editorial/library.mjs');await startLibrary(client,editorialKind);return;}
    if(editorialKind==='radar'){const {startRadar}=await import('./editorial/radar.mjs');await startRadar(client);return;}
    if(['news','reviews'].includes(editorialKind)){const {startEditorial}=await import('./editorial/editorial.mjs');await startEditorial(client,editorialKind);return;}
    const service=gameService(client), template=publicRoot.innerHTML;
    let previous='',busy=false,heroNode;
    async function refresh(){
      if(busy || document.querySelector('#game-dialog')?.open)return;
      busy=true;
      try {
        const games=await service.getGames(), serialized=JSON.stringify(games);
        if(serialized!==previous){
          const age=document.querySelector('[data-age][aria-pressed="true"]')?.dataset.age;
          const active=document.querySelector('[data-status][aria-selected="true"]')?.dataset.status;
          const filters=Object.fromEntries(['search','genre','sort','rec-mode','rec-genre'].map(id=>[id,document.getElementById(id)?.value]));
          publicRoot.innerHTML=template;initPublic(games);publicRoot.hidden=false;pageReady(publicRoot);
          if(heroNode)publicRoot.querySelector('#cinematic-hero').replaceWith(heroNode);
          else{heroNode=publicRoot.querySelector('#cinematic-hero');startCinematicHero(heroNode,client);}
          if(previous){
            if(age!=null)document.querySelector(`[data-age="${age}"]`)?.click();
            else if(active)document.querySelector(`[data-status="${active}"]`)?.click();
            for(const [id,value] of Object.entries(filters)){const el=document.getElementById(id);if(el && value!=null){el.value=value;el.dispatchEvent(new Event(id==='search'?'input':'change'));}}
          }
          previous=serialized;
        }
        loading.hidden=true;
      }catch {loading.hidden=false;loading.replaceChildren(document.createTextNode('Unable to load the collection. '));const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=refresh;loading.append(retry);}
      finally {busy=false;}
    }
    await refresh();
    let timer;
    client.channel('public-games').on('postgres_changes',{event:'*',schema:'public',table:'games'},()=>{clearTimeout(timer);timer=setTimeout(refresh,300);}).subscribe();
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
    setInterval(()=>{if(!document.hidden)refresh();},60000);
    publicRoot.addEventListener('close',refresh,true);
  }catch {loading.hidden=false;loading.textContent='The site could not connect. Check the Supabase configuration and reload.';}
}
start();
