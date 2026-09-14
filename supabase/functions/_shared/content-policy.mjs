// Shared by the API and browser. A metadata filter, not image classification.
const explicit=/\b(?:hentai|porn(?:ographic|ography)?|xxx|nsfw|erotic(?:a)?|sexual(?:ly)?|sex|nudity|nude|striptease|fetish|adults?[- ]only)\b/i;
const labels=value=>Array.isArray(value)?value.flatMap(v=>typeof v==='string'?[v]:[v?.name,v?.slug]).filter(v=>typeof v==='string'):[];
export function excludedExternalContent(game){
 if(!game||typeof game!=='object')return false;
 const rating=game.esrb_rating;
 if(rating?.id===5||/adults?[- ]only/i.test(String(rating?.slug||rating?.name||'')))return true;
 if(explicit.test([game.name,game.title,game.slug,...labels(game.tags),...labels(game.genres)].filter(v=>typeof v==='string').join(' ')))return true;
 const descriptors=game.content_descriptors;
 if(Array.isArray(descriptors?.ids)&&descriptors.ids.some(id=>[1,3,4].includes(Number(id))))return true;
 return typeof descriptors?.notes==='string'&&explicit.test(descriptors.notes);
}
