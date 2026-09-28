import {icon} from '../lib/ui.mjs';
import {normalizeGenres} from '../lib/genres.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function request(client,body){
 const {data,error}=await client.functions.invoke('game-metadata',{body});
 if(error||data?.error)throw new Error(data?.error||'Could not fetch game details. Check your connection and admin session, then retry.');return data;
}
export const lookupHTML=`<section class="metadata-lookup" aria-label="Game autofill"><label for="metadata-search">${icon('search')} Find a game to autofill<input id="metadata-search" type="search" placeholder="Start typing a game name…" autocomplete="off" aria-controls="metadata-results"></label><p class="muted">Choose a matching game, then review the details before saving. Data from <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer">RAWG</a>.</p><p id="metadata-message" role="status"></p><div id="metadata-results" class="metadata-results"></div></section>`;
export function bindLookup(form,client,genres){
 const search=form.querySelector('#metadata-search'),results=form.querySelector('#metadata-results'),message=form.querySelector('#metadata-message');let timer,version=0;
 const set=(key,value)=>{const el=form.elements.namedItem(key);if(el)el.type==='checkbox'?el.checked=Boolean(value):el.value=value??'';};
 async function select(id){
  const current=++version;clearTimeout(timer);message.textContent='Loading game details…';results.replaceChildren();
  // Editing stays available after the fetch; saving is disabled while the selection resolves.
  const submit=form.querySelector('.admin-actions .primary');submit.disabled=true;
  try{const {game}=await request(client,{action:'details',rawgId:id});if(current!==version||!form.isConnected)return;
   for(const key of ['title','year','releaseDate','future','rawgId'])set(key,game[key]);
   if(game.genres?.length)genres.set(normalizeGenres(game.genres));
   if(game.poster){set('poster',game.poster);set('posterSource',game.source);}
   if(game.description){set('description',game.description);set('descriptionSource',game.source);}
   if(game.metacritic!=null){set('metacritic',game.metacritic);set('metacriticSource',game.ratingUrl||game.source);set('metacriticChecked',new Date().toISOString().slice(0,10));set('metacriticPlatform','RAWG aggregate');}
   if(game.ratingUrl)set('ratingUrl',game.ratingUrl);
   message.textContent=`Filled from ${game.title}. Review and save to apply. Missing fields and existing YouTube links were left unchanged.`;
  }catch(error){if(current===version)message.textContent=error.message;}finally{if(current===version)submit.disabled=false;}
 }
 form.elements.namedItem('title').addEventListener('input',()=>{set('rawgId',null);});
 search.oninput=()=>{clearTimeout(timer);const current=++version,q=search.value.trim();results.replaceChildren();form.querySelector('.admin-actions .primary').disabled=false;
  if(q.length<2){message.textContent='Type at least two characters.';return;}message.textContent='Searching…';
  timer=setTimeout(async()=>{if(!form.isConnected)return;try{const {items}=await request(client,{action:'search',query:q});if(current!==version||!form.isConnected)return;
   results.innerHTML=items.map(g=>`<button type="button" data-rawg="${g.rawgId}"><strong>${esc(g.title)}</strong><span>${esc(g.year||'TBA')} · RAWG #${g.rawgId}</span></button>`).join('');
   message.textContent=items.length?`${items.length} suggestions. Choose the correct title and year.`:'No matches. Try a shorter name or enter the details manually.';
   results.querySelectorAll('button').forEach(b=>b.onclick=()=>select(Number(b.dataset.rawg)));
  }catch(error){if(current===version)message.textContent=error.message;}},350);
 };
 search.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('button')?.focus();}if(e.key==='Enter')e.preventDefault();if(e.key==='Escape'){++version;clearTimeout(timer);results.replaceChildren();form.querySelector('.admin-actions .primary').disabled=false;}};
 results.onkeydown=e=>{const buttons=[...results.querySelectorAll('button')],i=buttons.indexOf(e.target);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();buttons[Math.max(0,Math.min(buttons.length-1,i+(e.key==='ArrowDown'?1:-1)))]?.focus();}if(e.key==='Escape'){results.replaceChildren();search.focus();}};
}
export const syncHTML=`<section class="admin-panel metadata-sync"><h2>Refresh this month’s releases</h2><p>Check listed games against RAWG and update this UTC month’s release dates, future tags, scores and critic-page links. Fill missing artwork/descriptions. Play statuses and YouTube links stay unchanged.</p><div class="admin-actions"><button type="button" id="metadata-sync">Update this month’s details</button><button type="button" id="metadata-stop" hidden>Stop after current requests</button></div><p id="metadata-progress" role="status"></p><progress id="metadata-meter" value="0" max="1" hidden></progress><details id="metadata-report" hidden><summary>Update report</summary><ul></ul></details><small>Exact title/year matches only; ambiguous games need a match selected in Edit game. Updates use <a href="https://rawg.io/" target="_blank" rel="noopener noreferrer">RAWG</a> data. Keep this page open until finished.</small></section>`;
export function bindSync(root,client,getGames,onDone){
 const button=root.querySelector('#metadata-sync'),stop=root.querySelector('#metadata-stop'),progress=root.querySelector('#metadata-progress'),meter=root.querySelector('#metadata-meter'),report=root.querySelector('#metadata-report');let running=false,cancelled=false;
 stop.onclick=()=>{cancelled=true;stop.disabled=true;};
 button.onclick=async()=>{
  if(running)return;running=true;cancelled=false;button.disabled=true;stop.hidden=false;stop.disabled=false;report.hidden=false;report.querySelector('ul').replaceChildren();
  const games=getGames().slice(),counts={updated:0,unchanged:0,skipped:0,unmatched:0,conflict:0,failed:0};let next=0,finished=0;meter.hidden=false;meter.max=games.length||1;meter.value=0;
  const summary=()=>Object.entries(counts).map(([key,n])=>`${n} ${key}`).join(' · ');
  progress.textContent=`Checking ${games.length} games…`;
  await Promise.all(Array.from({length:3},async()=>{while(next<games.length&&!cancelled&&root.isConnected){const game=games[next++];let result;
   try{result=await request(client,{action:'sync-game',gameId:game.id});if(!Object.hasOwn(counts,result.status))throw new Error('Unexpected server response');counts[result.status]++;}catch(e){counts.failed++;result={status:'failed',message:e.message};}
   const li=document.createElement('li');li.textContent=`${game.title}: ${result.message||result.status}`;report.querySelector('ul').append(li);meter.value=++finished;progress.textContent=`${finished}/${games.length} checked · ${summary()}`;
  }}));
  running=false;button.disabled=false;stop.hidden=true;progress.textContent=`${cancelled?'Stopped':'Finished'}: ${finished}/${games.length} checked · ${summary()}`;
  if(root.isConnected)try{await onDone();}catch{progress.textContent+=' · Reload Games to see the latest saved details.';}
 };
}
