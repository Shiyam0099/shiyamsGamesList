export const genreCatalogue=[
 'Action','Action Adventure','Action RPG','Adventure','Arcade','Arena Shooter','Artillery','Auto Battler',
 'Battle Royale','Beat ’em Up','Board Game','Bullet Hell','Card Game','Casual','City Builder','Collectathon',
 'Colony Sim','Comedy','Construction & Management','Cooking','Co-op','Crime','Deckbuilder','Detective',
 'Dungeon Crawler','Educational','Exploration','Extraction Shooter','Factory Automation','Farming Sim',
 'Fighting','Flight Sim','Football','FPS','Grand Strategy','Hack and Slash','Hidden Object','Horror',
 'Idle / Incremental','Immersive Sim','Interactive Fiction','JRPG','Life Sim','Looter Shooter','Management',
 'Metroidvania','MMO','MMORPG','MOBA','Music','Mystery','Narrative Adventure','Open World','Party',
 'Pinball','Platformer','Point & Click','Precision Platformer','Psychological Horror','Puzzle',
 'Puzzle Platformer','Racing','Real-Time Strategy','Real-Time Tactics','Rhythm','Roguelike','Roguelite',
 'RPG','Sandbox','Sci-Fi','Shoot ’em Up','Shooter','Simulation','Social Deduction','Soulslike','Space Sim',
 'Sports','Stealth','Strategy','Survival','Survival Horror','Tactical RPG','Tactical Shooter','Third-Person Shooter',
 'Tower Defense','Trading','Trivia','Turn-Based RPG','Turn-Based Strategy','Turn-Based Tactics','Vehicle Combat',
 'Visual Novel','VR','Walking Simulator','Western','Wrestling','4X'
];

const key=value=>String(value).normalize('NFKC').toLowerCase().replace(/[’‘']/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
const canonical=new Map(genreCatalogue.map(g=>[key(g),g]));
for(const genre of ['Expansion','Espionage','Third-Person Action']){genreCatalogue.push(genre);canonical.set(key(genre),genre);}
const aliases={
 'open word':['Open World'],'open world rpg':['Open World','RPG'],
 'open world action rpg':['Open World','Action RPG'],'open word rpg':['Open World','RPG'],
 'open word action rpg':['Open World','Action RPG'],
 'action platformer':['Action','Platformer'],'action roguelike':['Action','Roguelike'],
 'action shooter':['Action','Shooter'],'2d action exploration':['Action','Exploration'],
 'brawler':['Beat ’em Up'],'beat em up':['Beat ’em Up'],'first person shooter':['FPS'],
 'role playing':['RPG'],'role playing game':['RPG'],'role playing games':['RPG'],
 'arpg':['Action RPG'],'action role playing':['Action RPG'],
 'rts':['Real-Time Strategy'],'tps':['Third-Person Shooter'],
 'hack n slash':['Hack and Slash'],'hack slash':['Hack and Slash'],
 'sci fi':['Sci-Fi'],'science fiction':['Sci-Fi']
};
export function normalizeGenres(values=[]){
 const result=[];
 for(const value of values){const normalized=key(value);if(!normalized)continue;
  const mapped=aliases[normalized] || [canonical.get(normalized) || normalized.split(' ').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ')];
  for(const genre of mapped)if(!result.includes(genre))result.push(genre);
 }
 return result;
}
export function genreMatches(genre,query){return key(genre).includes(key(query));}
