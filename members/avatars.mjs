import {extraPortraits,extraPortraitSVG} from './extra-portraits.mjs';
import {characterDetail,outfits} from './character-details.mjs';
// Original vector portraits inspired by recognizable game-character silhouettes.
// Fixed selections only: no upload, remote URL or user-supplied SVG is accepted.
export const characters=[
 ['Master Chief','#4a7250','helmet'],['Link','#d6b553','hood'],['Mario','#d63a43','cap'],['Lara Croft','#654334','hair'],['Kratos','#eee0cf','warrior'],
 ['Samus Aran','#f08b35','helmet'],['Cloud Strife','#edce6b','spike'],['Geralt of Rivia','#e7e3dd','hair'],['Sonic','#3188ee','spike'],['Solid Snake','#554f46','band'],
 ['Ezio Auditore','#e8e5df','hood'],['Aloy','#c76936','hair'],['Arthur Morgan','#75553d','cap'],['Leon Kennedy','#b49368','hair'],['Jill Valentine','#6293c3','cap'],
 ['Dante','#e9e7e6','spike'],['Bayonetta','#322d46','hair'],['Doom Slayer','#738844','helmet'],['Kirby','#f096c0','orb'],['Pikachu','#f3d33b','ears'],
 ['Mega Man','#3da8de','helmet'],['Ryu','#392a24','band'],['Chun-Li','#533b2e','bun'],['Scorpion','#e6bd37','mask'],['Sub-Zero','#459ad3','mask'],
 ['Pac-Man','#f8d83c','orb'],['Donkey Kong','#754422','ears'],['Crash Bandicoot','#e99132','spike'],['Spyro','#a278d2','ears'],['Fox McCloud','#c48546','ears'],
 ['Princess Zelda','#eccd72','crown'],['Princess Peach','#edbd65','crown'],['Luigi','#4eac65','cap'],['Bowser','#d7a747','spike'],['Yoshi','#67b861','orb'],
 ['Nathan Drake','#624333','hair'],['Ellie','#875b43','hair'],['Joel Miller','#776a60','hair'],['Jin Sakai','#252e36','band'],['2B','#eee9df','mask'],
 ['Senua','#534335','warrior'],['Commander Shepard','#373c48','warrior'],['Marcus Fenix','#566579','band'],['Gordon Freeman','#926640','glasses'],['GLaDOS','#e4e7de','robot'],
 ['Tracer','#906139','glasses'],['Mercy','#e7d18f','crown'],['Steve','#785334','square'],['Sans','#f1f2eb','skull'],['Hollow Knight','#e7e9dc','horns'],
 ...extraPortraits.map(p=>[p.name,p.color,'custom'])
];
export const avatarCategories=[['game','Game'],['anime','Anime'],['superhero','Superhero']];
export const avatarCategory=id=>Number(id)<50?'game':extraPortraits[Number(id)-50]?.category||'game';
export const defaultBio='New worlds. Late nights. One more quest. This is my save file, and every game has a story.';
export function avatarURL(id=0){
 const n=Number.isInteger(Number(id))&&Number(id)>=0&&Number(id)<characters.length?Number(id):0;
 if(n>=50)return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(extraPortraitSVG(n-50));
 const [name,color,kind]=characters[n],accent=['#d4ff72','#80d4fc','#ffb996','#baa6ff','#f2c764'][n%5];
 const skin='#e8ba94';
 let detail='';
 if(['helmet','mask','robot'].includes(kind))detail=`<path d="M53 73Q53 43 90 43T127 73L124 112L107 131H73L56 112Z" fill="${color}"/><path d="M58 76L122 76L116 91L64 91Z" fill="${accent}"/><path d="M65 100H115L105 119H75Z" fill="#202e32"/>`;
 else if(['orb','skull'].includes(kind))detail=`<ellipse cx="90" cy="89" rx="40" ry="38" fill="${color}"/><ellipse cx="77" cy="85" rx="5" ry="10" fill="#152322"/><ellipse cx="103" cy="85" rx="5" ry="10" fill="#152322"/><path d="M79 108Q90 116 101 108" fill="none" stroke="#152322" stroke-width="4"/>`;
 else if(kind==='horns')detail=`<path d="M57 51L49 23L70 44H110L130 23L122 58V108Q90 136 58 108Z" fill="${color}"/><ellipse cx="74" cy="85" rx="8" ry="14" fill="#142529"/><ellipse cx="108" cy="85" rx="8" ry="14" fill="#142529"/>`;
 else{
  detail=`<path d="M57 65Q90 36 123 65L120 105Q90 141 60 105Z" fill="${skin}"/>`;
  if(kind==='hood')detail+=`<path d="M43 123L49 66L90 33L131 66L137 123L118 110L116 72L90 59L64 72L62 110Z" fill="${color}"/>`;
  else if(kind==='cap')detail+=`<path d="M53 66Q52 34 90 39Q121 36 125 68L139 77H53Z" fill="${color}"/><path d="M55 64H126" stroke="${accent}" stroke-width="5"/>`;
  else if(kind==='spike')detail+=`<path d="M51 82L44 52L62 55L69 24L88 48L103 20L113 51L135 44L124 79L102 61L81 74L64 66Z" fill="${color}"/>`;
  else if(kind==='ears')detail+=`<path d="M50 77L43 28L72 49Q90 39 108 49L138 28L128 84L112 64L90 73L65 64Z" fill="${color}"/>`;
  else if(kind==='square')detail+=`<path d="M54 45H126V87H113V68H67V86H54Z" fill="${color}"/>`;
  else if(kind==='warrior')detail+=`<path d="M59 66Q90 37 121 66" stroke="${color}" stroke-width="10" fill="none"/><path d="M91 55L77 92L88 123" stroke="#b64740" stroke-width="9" fill="none"/>`;
  else detail+=`<path d="M49 98L52 61Q63 33 91 41Q124 35 129 68L126 105L114 80L108 61L61 83L62 111Z" fill="${color}"/>`;
  detail+='<path d="M68 87H80M100 87H112" stroke="#20302e" stroke-width="5" stroke-linecap="round"/><path d="M81 112H99" stroke="#754c40" stroke-width="3"/>';
  if(kind==='band')detail+=`<path d="M55 75H126L140 93" fill="none" stroke="${accent}" stroke-width="9"/>`;
  if(kind==='glasses')detail+=`<path d="M61 78H84V94H61ZM96 78H119V94H96ZM84 82H96" fill="#213338" stroke="${accent}" stroke-width="3"/>`;
  if(kind==='crown')detail+=`<path d="M62 56L56 32L80 43L90 23L101 43L125 32L117 56Z" fill="#e3bc56"/>`;
  if(kind==='bun')detail+=`<circle cx="53" cy="60" r="14" fill="${color}"/><circle cx="127" cy="60" r="14" fill="${color}"/>`;
 }
 detail=characterDetail(n,detail);
 const torso=[8,18,19,25,27,28,33,34,44,49].includes(n)?'':`<path d="M25 180V153Q40 125 73 121H107Q140 125 155 153V180" fill="${outfits[n]}"/><path d="M73 124L90 148L107 124" fill="#182c2d"/>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" rx="30" fill="#142525"/><path d="M0 130L140 0H180V50L50 180H0Z" fill="${accent}" opacity=".13"/><circle cx="90" cy="83" r="64" fill="none" stroke="${accent}" opacity=".3"/>${torso}${detail}<path d="M18 20H38M18 20V40M162 160H142M162 160V140" fill="none" stroke="${accent}" stroke-width="3"/></svg>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
