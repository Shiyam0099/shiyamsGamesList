/* Static, dependency-free. Edit games.js to maintain the public collection. */
const games=window.GAMES;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusNames={unplayed:'Haven’t played',loved:'Played & loved',dropped:'Played & dropped'};
const counts=Object.fromEntries(Object.keys(statusNames).map(s=>[s,games.filter(g=>g.status===s).length]));
$('#stats').innerHTML=[[games.length,'Games in the collection','A growing personal archive'],[counts.unplayed,'Haven’t played','The adventures ahead'],[counts.loved,'Played & loved','The ones that stayed'],[counts.dropped,'Played & dropped','Not every game clicks']].map(([n,t,d])=>`<div class="stat"><strong>${n}</strong><span>${t}<small>${d}</small></span></div>`).join('');
$$('[data-status]').forEach(b=>b.querySelector('span').textContent=counts[b.dataset.status]);
const genreList=[...new Set(games.flatMap(g=>g.genres))].sort();
genreList.forEach(g=>$('#genre').add(new Option(g,g)));
const placeholder='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560"><rect width="400" height="560" fill="#25301e"/><text x="200" y="270" font-family="Arial" font-size="25" text-anchor="middle" fill="#cefa69">SIMS GAMES LIST</text><text x="200" y="308" font-family="Arial" font-size="16" text-anchor="middle" fill="#a2aa9b">Artwork unavailable</text></svg>');
let selected='unplayed',recommendation=null;
function imgError(event){event.target.onerror=null;event.target.src=placeholder;}
function render(){
 const q=$('#search').value.toLowerCase().trim(), genre=$('#genre').value;
 let list=games.filter(g=>g.status===selected&&(!q||g.title.toLowerCase().includes(q))&&(!genre||g.genres.includes(genre)));
 const mode=$('#sort').value;
 if(mode==='title')list.sort((a,b)=>a.title.localeCompare(b.title));
 if(mode==='newest'||mode==='oldest')list.sort((a,b)=>{const ay=Number(a.year)||null,by=Number(b.year)||null;return ay===null&&by===null?0:ay===null?1:by===null?-1:mode==='newest'?by-ay:ay-by});
 $('#result-count').textContent=`${list.length} of ${counts[selected]} games`;
 $('#collection-note').textContent={unplayed:'The adventures still ahead. Includes my future-release watchlist.',loved:'Finished, loved, and worth remembering.',dropped:'Tried them. Moved on. No hard feelings.'}[selected];
 $('#grid').setAttribute('aria-labelledby','tab-'+selected);
 $('#grid').innerHTML=list.length?list.map(g=>`<article class="card"><button class="cover-button" data-game="${g.id}" aria-label="${g.videoId?'Watch trailer for':'View details for'} ${escapeHTML(g.title)}"><img src="${escapeHTML(g.poster||placeholder)}" alt="${escapeHTML(g.title)} artwork" loading="lazy" decoding="async"><span class="cover-index">${g.id}</span><span class="cover-play"><span class="play-icon">${g.videoId?'▶':'+'}</span>${g.videoId?'Watch trailer':'Game details'}</span></button><h3>${escapeHTML(g.title)}</h3><div class="card-meta">${escapeHTML(g.year)} · ${escapeHTML(g.genres[0])}</div>${g.future?'<div class="card-tag">Future / TBA watchlist</div>':''}</article>`).join(''):'<div class="empty"><h3>No games found</h3><p>Try another title or genre.</p><button id="clear-search">Clear filters</button></div>';
 $$('#grid img').forEach(i=>i.addEventListener('error',imgError));
}
function switchTab(button){selected=button.dataset.status;$$('[role=tab]').forEach(b=>{b.setAttribute('aria-selected',String(b===button));b.tabIndex=b===button?0:-1});render();}
$$('[role=tab]').forEach((b,i,all)=>{b.tabIndex=i===0?0:-1;b.addEventListener('click',()=>switchTab(b));b.addEventListener('keydown',e=>{let index=null;if(e.key==='ArrowRight')index=(i+1)%all.length;if(e.key==='ArrowLeft')index=(i+all.length-1)%all.length;if(e.key==='Home')index=0;if(e.key==='End')index=all.length-1;if(index!==null){e.preventDefault();all[index].focus();switchTab(all[index])}})});
$('#search').addEventListener('input',render);$('#genre').addEventListener('change',render);$('#sort').addEventListener('change',render);
$('#grid').addEventListener('click',e=>{const b=e.target.closest('[data-game]');if(b)showGame(Number(b.dataset.game));if(e.target.id==='clear-search'){$('#search').value='';$('#genre').value='';render()}});
// Deterministic genre affinity; dropped genres are a small negative signal, not a ban.
const loved=games.filter(g=>g.status==='loved'),dropped=games.filter(g=>g.status==='dropped');
const affinity=Object.fromEntries(genreList.map(genre=>[genre,3*loved.filter(g=>g.genres.includes(genre)).length/Math.max(1,loved.length)-dropped.filter(g=>g.genres.includes(genre)).length/Math.max(1,dropped.length)]));
const eligible=games.filter(g=>g.status==='unplayed'&&!g.future&&!g.genres.some(x=>/expansion/i.test(x)));
const score=g=>g.genres.reduce((n,t)=>n+(affinity[t]||0),0)/Math.sqrt(g.genres.length);
const ranked=eligible.slice().sort((a,b)=>score(b)-score(a)||a.id-b.id);
let seen=new Set();
try{const stored=JSON.parse(sessionStorage.getItem('sims-rec-seen')||'[]');if(Array.isArray(stored))seen=new Set(stored.filter(id=>eligible.some(g=>g.id===id)));}catch{}
function nextRecommendation(){
 if(!ranked.length){$('#rec-info').innerHTML='<p>No eligible backlog games remain.</p>';$('#next-rec').disabled=true;$('#rec-trailer').disabled=true;return;}
 if(seen.size>=ranked.length)seen.clear();
 recommendation=ranked.find(g=>!seen.has(g.id))||ranked[0];seen.add(recommendation.id);try{sessionStorage.setItem('sims-rec-seen',JSON.stringify([...seen]));}catch{}
 const shared=recommendation.genres.slice().sort((a,b)=>(affinity[b]||0)-(affinity[a]||0))[0];
 const example=loved.find(g=>g.genres.includes(shared));
 $('#rec-info').innerHTML=`<h3>${escapeHTML(recommendation.title)}</h3><div class="rec-meta">${escapeHTML(recommendation.year)} / ${recommendation.genres.map(escapeHTML).join(' · ')}</div><p class="rec-reason">${example?`Because ${escapeHTML(shared.toLowerCase())} games like <strong>${escapeHTML(example.title)}</strong> made your loved list.`:'A different world from your unplayed collection.'}</p>`;
 $('#rec-image').src=recommendation.poster||placeholder;$('#rec-image').alt=recommendation.title+' artwork';
 $('#rec-trailer').textContent=recommendation.videoId?'▶ Watch trailer':'View game details';
}
$('#rec-image').addEventListener('error',imgError);$('#next-rec').addEventListener('click',nextRecommendation);$('#rec-trailer').addEventListener('click',()=>recommendation&&showGame(recommendation.id));
const dialog=$('#game-dialog');
function showGame(id){
 const game=games.find(g=>g.id===id);if(!game)return;
 $('#dialog-title').textContent=game.title;$('#dialog-meta').textContent=`${game.year} · ${game.genres.join(' / ')} · ${statusNames[game.status]}`;
 const slot=$('#video-slot');slot.replaceChildren();
 if(game.videoId&&/^[\w-]{11}$/.test(game.videoId)){
   const iframe=document.createElement('iframe');iframe.src=`https://www.youtube-nocookie.com/embed/${game.videoId}?rel=0`;iframe.title=game.title+' official trailer';iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.allowFullscreen=true;slot.append(iframe);
 }else{const p=document.createElement('p');p.textContent='An official embeddable trailer has not been verified for this entry yet.';slot.append(p)}
 $('#dialog-description').textContent=game.description||'';
 $('#dialog-links').innerHTML=[game.videoId?`<a href="https://www.youtube.com/watch?v=${game.videoId}" target="_blank" rel="noopener noreferrer">Open trailer on YouTube ↗</a>`:'',game.ratingUrl?`<a href="${escapeHTML(game.ratingUrl)}" target="_blank" rel="noopener noreferrer">View critic reviews ↗</a>`:'',game.posterSource?`<a href="${escapeHTML(game.posterSource)}" target="_blank" rel="noopener noreferrer">Artwork source ↗</a>`:'',game.videoChannel?`<span>Trailer: ${escapeHTML(game.videoChannel)}</span>`:''].join('');
 dialog.showModal();$('#close-dialog').focus();
}
$('#close-dialog').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});dialog.addEventListener('close',()=>$('#video-slot').replaceChildren());
render();nextRecommendation();
