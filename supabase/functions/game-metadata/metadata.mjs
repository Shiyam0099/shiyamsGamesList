import {excludedExternalContent} from '../_shared/content-policy.mjs';
const normalized=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function exactMatch(row,results){
 const matches=results.filter(g=>!excludedExternalContent(g)&&normalized(g.name)===normalized(row.title)&&(!row.release_year||g.released?.slice(0,4)===String(row.release_year)));
 const unique=[...new Map(matches.map(g=>[g.id,g])).values()];return unique.length===1?unique[0]:null;
}
const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value?value:null;
const url=(value,host)=>{try{const u=new URL(value);return u.protocol==='https:'&&(!host||u.hostname===host||u.hostname.endsWith('.'+host))&&!u.username&&!u.password?u.href:'';}catch{return '';}};
export function metadata(g,now=new Date()){
 if(!g||!Number.isInteger(g.id)||typeof g.name!=='string'||excludedExternalContent(g))throw new Error('No usable game details');
 const released=date(g.released),source='https://rawg.io/games/'+encodeURIComponent(g.slug||String(g.id));
 const data={rawgId:g.id,title:g.name.slice(0,300),year:released?released.slice(0,4):'',releaseDate:released,future:!released||g.tba===true||released>now.toISOString().slice(0,10),source,
  genres:(g.genres||[]).map(v=>v.name).filter(v=>typeof v==='string').slice(0,30),poster:url(g.background_image,'media.rawg.io'),
  description:typeof g.description_raw==='string'?g.description_raw.slice(0,5000):'',
  metacritic:Number.isInteger(g.metacritic)&&g.metacritic>0&&g.metacritic<=100?g.metacritic:null,ratingUrl:url(g.metacritic_url,'metacritic.com')};
 return data;
}
export function monthlyPatch(row,data,now=new Date()){
 const month=now.toISOString().slice(0,7),oldMonth=row.release_date?.slice(0,7),newMonth=data.releaseDate?.slice(0,7);
 // Previously dated for this month also needs correction when the release is delayed.
 if(oldMonth!==month&&newMonth!==month)return null;
 const patch={rawg_id:data.rawgId,release_date:data.releaseDate,release_year:data.year?Number(data.year):null,future:data.future};
 if(data.metacritic!==null){patch.metacritic=data.metacritic;patch.metacritic_source=data.ratingUrl||data.source;patch.metacritic_checked=now.toISOString().slice(0,10);patch.metacritic_platform='RAWG aggregate';}
 if(data.ratingUrl)patch.rating_url=data.ratingUrl;
 if(!row.poster&&data.poster){patch.poster=data.poster;patch.poster_source=data.source;}
 if(!row.description&&data.description){patch.description=data.description;patch.description_source=data.source;}
 if(!row.genres?.length&&data.genres.length)patch.genres=data.genres;
 return Object.fromEntries(Object.entries(patch).filter(([key,value])=>JSON.stringify(row[key]??null)!==JSON.stringify(value)));
}
