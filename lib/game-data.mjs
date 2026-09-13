export const statuses = {unplayed: 'Yet to play', loved: 'Played & loved', dropped: 'Dropped', playing: 'Currently playing'};
export const fields = {
  title:'title', year:'release_year', genres:'genres', status:'status', future:'future', poster:'poster',
  videoId:'video_id', description:'description', ratingUrl:'rating_url', posterSource:'poster_source',
  videoChannel:'video_channel', videoSource:'video_source', metacritic:'metacritic', downloadLink:'download_link',
  metacriticSource:'metacritic_source', metacriticChecked:'metacritic_checked', metacriticPlatform:'metacritic_platform',
  descriptionSource:'description_source', criticVideoUrl:'critic_video_url'
};
export function fromRow(row) {
  return {id:Number(row.id), ...Object.fromEntries(Object.entries(fields).map(([key,column])=>[key,key==='year' ? (row[column] == null ? 'TBA' : String(row[column])) : row[column]]))};
}
export function toRow(game, includeId=false) {
  const row=Object.fromEntries(Object.entries(fields).map(([key,column])=>[column,game[key] ?? null]));
  row.release_year=game.year==null || game.year==='' || game.year==='TBA' ? null : Number(game.year);
  for(const column of ['poster','video_id','description','video_channel','download_link']) row[column] ??= '';
  row.future=Boolean(game.future); row.download_link=game.downloadLink || game['Download Link'] || '';
  if(includeId) row.id=Number(game.id);
  return row;
}
export function httpURL(value) {
  if(!value) return '';
  try {const url=new URL(value); if(['https:','http:'].includes(url.protocol) && !url.username && !url.password) return url.href;} catch {}
  throw new Error('Use a full HTTP or HTTPS URL.');
}
export function videoID(value) {
  if(!value) return '';
  if(/^[\w-]{11}$/.test(value)) return value;
  try {const url=new URL(value); const host=url.hostname.replace(/^www\./,'');
    if(['youtube.com','m.youtube.com','youtu.be','youtube-nocookie.com'].includes(host)) {
      const id=host==='youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.split('/').at(-1);
      if(/^[\w-]{11}$/.test(id)) return id;
    }
  } catch {}
  throw new Error('Enter an 11-character YouTube video ID or a YouTube video URL.');
}
export function validateGame(game) {
  if(!game.title?.trim() || game.title.trim().length>300) throw new Error('Enter a game title (up to 300 characters).');
  if(game.year!=='' && game.year!=='TBA' && game.year!=null && (!/^\d{4}$/.test(String(game.year)) || Number(game.year)<1000)) throw new Error('Enter a four-digit release year, or leave it blank for TBA.');
  if(!Array.isArray(game.genres) || !game.genres.length || game.genres.length>30 || game.genres.some(g=>!g.trim())) throw new Error('Enter at least one genre (up to 30).');
  if(!Object.hasOwn(statuses,game.status)) throw new Error('Choose a valid status.');
  if(game.metacritic!=null && (!Number.isInteger(game.metacritic) || game.metacritic<0 || game.metacritic>100)) throw new Error('Metacritic must be a whole number between 0 and 100.');
  if((game.description || '').length>5000) throw new Error('Keep the description under 5,000 characters.');
  for(const key of ['poster','ratingUrl','posterSource','videoSource','downloadLink','metacriticSource','descriptionSource','criticVideoUrl']) {
    try {httpURL(game[key]);} catch {throw new Error(`${key}: use a full HTTP or HTTPS URL.`);}
  }
  if(game.metacriticChecked && (!/^\d{4}-\d{2}-\d{2}$/.test(game.metacriticChecked) || new Date(game.metacriticChecked).toISOString().slice(0,10)!==game.metacriticChecked)) throw new Error('Enter a valid score-check date.');
  return {...game,title:game.title.trim(),videoId:videoID(game.videoId),genres:[...new Set(game.genres.map(g=>g.trim()))]};
}
export function friendlyError(error) {
  if(error?.code==='23505') return 'That title and release year, or username, already exists.';
  if(['42501','PGRST301','PGRST303'].includes(error?.code) || error?.status===403) return 'Your account does not have permission. Sign in again or contact the Super Admin.';
  if(error?.code==='23514' || error?.code==='22P02') return 'Check the supplied values and try again.';
  return 'The request could not be completed. Check your connection and try again.';
}
export function gameService(client) {
  const check=({data,error})=>{if(error) throw error;return data;};
  return {
    async getGames(){const rows=[];for(let start=0;;start+=500){const page=check(await client.from('games').select('*').order('id').range(start,start+499));rows.push(...page);if(page.length<500)break;}return rows.map(fromRow);},
    async getGameById(id){return fromRow(check(await client.from('games').select('*').eq('id',id).single()));},
    async getCurrentlyPlayingGames(){return (await this.getGames()).filter(g=>g.status==='playing');},
    async create(game){return fromRow(check(await client.from('games').insert(toRow(validateGame(game))).select().single()));},
    async update(id,game){return fromRow(check(await client.from('games').update(toRow(validateGame(game))).eq('id',id).select().single()));},
    async setStatus(id,status){if(!Object.hasOwn(statuses,status))throw new Error('Invalid status');check(await client.from('games').update({status}).eq('id',id).select('id').single());},
    async remove(id){check(await client.from('games').delete().eq('id',id).select('id').single());},
    async setPlaying(ids){check(await client.rpc('set_currently_playing',{game_ids:ids}));}
  };
}
