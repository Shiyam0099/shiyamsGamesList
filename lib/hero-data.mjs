import {excludedExternalContent} from '../supabase/functions/_shared/content-policy.mjs';
export function anticipatedShowcase(items,now=new Date()){
 const start=now.toISOString().slice(0,10),end=now.getUTCFullYear()+'-12-31',seen=new Set();
 return (Array.isArray(items)?items:[]).filter(g=>!excludedExternalContent(g)&&g && Number.isInteger(g.id) && typeof g.title==='string' && /^\d{4}-\d{2}-\d{2}$/.test(g.releaseDate) && g.releaseDate>=start && g.releaseDate<=end && !seen.has(g.id) && seen.add(g.id)).sort((a,b)=>(Number(b.interest)||0)-(Number(a.interest)||0)).slice(0,10);
}
