import {excludedExternalContent} from '../_shared/content-policy.mjs';
export const calendarOrders={date:'released,-added',newest:'-released,-added',popular:'-added',rating:'-metacritic',title:'name'};
export const calendarPlatforms={all:'',pc:'1',playstation:'2',xbox:'3',nintendo:'7',ios:'4',android:'8',mac:'5',linux:'6'};
export const POPULAR_MIN=100;
export function dateWindow(kind,now=new Date()){
 const day=now.toISOString().slice(0,10),year=now.getUTCFullYear(),month=day.slice(0,7);
 if(kind==='last-year')return {start:(year-1)+'-01-01',end:(year-1)+'-12-31',key:String(year-1)};
 return ['month','calendar'].includes(kind)?{start:month+'-01',end:new Date(Date.UTC(year,now.getUTCMonth()+1,0)).toISOString().slice(0,10),key:month}:{start:day,end:year+'-12-31',key:day};
}
export function rawgGames(data,kind,now=new Date(),period=dateWindow(kind,now)){
 if(!Array.isArray(data?.results))throw new Error('Invalid release response');
 const {start,end}=period,seen=new Set();
 return data.results.filter(g=>g && !excludedExternalContent(g) && Number.isInteger(g.id) && typeof g.name==='string' && (kind==='top250'?Number.isFinite(g.metacritic)&&g.metacritic>0&&g.metacritic<=100:/^\d{4}-\d{2}-\d{2}$/.test(g.released) && g.released>=start && g.released<=end) && !seen.has(g.id) && seen.add(g.id)).map(g=>({id:g.id,title:g.name.slice(0,300),url:'https://rawg.io/games/'+encodeURIComponent(g.slug || String(g.id)),image:typeof g.background_image==='string' && /^https:\/\/media\.rawg\.io\//.test(g.background_image)?g.background_image:'',releaseDate:g.released||null,metacritic:Number.isFinite(g.metacritic)?g.metacritic:null,interest:Number.isFinite(g.added)?g.added:0,platforms:(g.parent_platforms || []).map(p=>p.platform?.name).filter(n=>typeof n==='string').slice(0,6)})).sort((a,b)=>kind==='calendar'?0:kind==='top250'?b.metacritic-a.metacritic:['month','calendar'].includes(kind)?a.releaseDate.localeCompare(b.releaseDate)||b.interest-a.interest:b.interest-a.interest);
}
export function steamRanks(data){
 if(!Array.isArray(data?.response?.ranks))throw new Error('Invalid Steam chart');
 return data.response.ranks.filter(g=>Number.isInteger(g.appid)&&g.appid>0).slice(0,25);
}

export function radarRequest(params,now=new Date()){
 const kind=params.get('kind')||'trending';
 if(!['trending','month','anticipated','last-year','top250','calendar'].includes(kind))throw new Error('Unknown category.');
 if(kind!=='calendar')return {kind,page:1,period:dateWindow(kind,now),cacheKey:kind+':'+(kind==='trending'?'current':kind==='top250'?'all':dateWindow(kind,now).key)};
 const month=params.get('month')||now.toISOString().slice(0,7),pageText=params.get('page')||'1',day=params.get('day');
 if(!/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(month)||!/^\d{1,4}$/.test(pageText)||Number(pageText)<1||Number(pageText)>1000)throw new Error('Invalid calendar month or page.');
 const order=params.get('order')||'date',platform=params.get('platform')||'all',popular=params.get('popular')||'0';
 if(!Object.hasOwn(calendarOrders,order)||!Object.hasOwn(calendarPlatforms,platform)||!['0','1'].includes(popular))throw new Error('Invalid calendar filter.');
 const period=dateWindow('month',new Date(month+'-01T12:00:00Z'));
 if(day!==null){if(!/^\d{2}$/.test(day)||Number(day)<1||Number(day)>Number(period.end.slice(8)))throw new Error('Invalid calendar day.');period.start=period.end=month+'-'+day;}
 return {kind,page:Number(pageText),period,order,platform,popular:popular==='1',cacheKey:`calendar:${period.start}:${period.end}:${Number(pageText)}:${order}:${platform}:${popular}`};
}
