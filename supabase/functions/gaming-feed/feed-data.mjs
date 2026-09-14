const asArray=value=>value==null?[]:Array.isArray(value)?value:[value];
const scalar=value=>typeof value==='string'?value:typeof value==='number'?String(value):value?.['#text'] || '';
export function plainText(value){
 return scalar(value).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,(_,entity)=>{
  if(entity.startsWith('#')){const point=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);return point>0 && point<=0x10ffff?String.fromCodePoint(point):'';}
  return {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '}[entity.toLowerCase()];
 }).replace(/\s+/g,' ').trim();
}
function safeURL(value,hosts){try{const url=new URL(scalar(value));if(url.protocol==='https:' && !url.username && !url.password && hosts.some(host=>url.hostname===host || url.hostname.endsWith('.'+host)))return url.href;}catch{}return '';}
export function parseFeed(xml,source,kind,Parser){
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('Unsupported XML declarations');
 const feed=new Parser({ignoreAttributes:false,processEntities:false}).parse(xml);
 const entries=asArray(feed.rss?.channel?.item);if(!feed.rss?.channel)throw new Error('Invalid publisher feed');
 return entries.flatMap(item=>{
  const title=plainText(item.title).slice(0,300),url=safeURL(item.link,[source.host]);
  const publishedAt=new Date(scalar(item.pubDate));
  if(!title || !url || !Number.isFinite(publishedAt.getTime()))return [];
  const categories=asArray(item.category).map(plainText);
  if(source.name==='PC Gamer'){
   if(item['cf:isSponsored']==='true' || item['cf:isSponsored']===true || /\/hardware\//.test(url) || !categories.some(c=>/^games$/i.test(c)))return [];
   const review=/\breview\b/i.test(title) || /\/reviews\//.test(url);
   if(kind==='reviews'?!review:review)return [];
  }
  const media=[...asArray(item['media:thumbnail']),...asArray(item['media:content']),...asArray(item.enclosure)].find(media=>media?.['@_url']);
  const image=safeURL(media?.['@_url'],['gamespot.com','futurecdn.net']);
  // RSS discovery cards link to the publisher; never republish full article bodies.
  const words=plainText(item.description).split(' ').filter(Boolean);
  const excerpt=words.slice(0,24).join(' ')+(words.length>24?'…':'');
  return [{id:url,title,url,image,excerpt,publishedAt:publishedAt.toISOString(),source:source.name,author:plainText(item['dc:creator']).slice(0,100),kind}];
 });
}
export function mergeArticles(groups){return [...new Map(groups.flat().map(item=>[item.url,item])).values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,60);}
