import {icon} from '../lib/ui.mjs';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safe=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
export const dateLabel=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(value+'T12:00:00Z').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'Release date unknown';
export function gameCard(g,i,kind){
 const rank=['month','calendar'].includes(kind)?g.releaseDate?.slice(8):String(i+1).padStart(2,'0');
 const metric=kind==='trending'?Number(g.players).toLocaleString()+' playing now':kind==='top250'?`${Number(g.metacritic)} / 100 Metacritic`:dateLabel(g.releaseDate);
 return `<article class="radar-card"><a href="${esc(safe(g.url))}" target="_blank" rel="noopener noreferrer"><div class="radar-art">${safe(g.image)?`<img src="${esc(safe(g.image))}" alt="" loading="lazy">`:''}<span class="radar-fallback">${icon('game')}</span><span class="radar-rank">${esc(rank)}</span></div><div class="radar-copy"><p class="radar-platforms">${esc((g.platforms||[]).join(' · '))}</p><h3>${esc(g.title)}</h3><p class="radar-metric">${esc(metric)}</p>${['anticipated','last-year'].includes(kind)?`<p class="muted">${Number(g.interest).toLocaleString()} RAWG list additions</p>`:''}${kind==='top250'?`<p class="muted">${esc(dateLabel(g.releaseDate))}</p>`:''}<span class="radar-link">${kind==='trending'?'View on Steam':'Explore on RAWG'} ${icon('external')}<span class="sr-only"> (opens in a new tab)</span></span></div></a></article>`;
}
export function imageFallbacks(root){root.querySelectorAll('.radar-art img').forEach(img=>img.onerror=()=>img.remove());}
