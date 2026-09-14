import checkpoint from '../assets/brand-checkpoint.svg?raw';
import checkpointIcon from '../assets/brand-checkpoint.svg';
// Switch to 'original' to restore the previous logo everywhere, including the favicon.
export const brandDesign='checkpoint';
export const originalBrand=`<span class="brand-mark">S<span>+</span></span><span>SHIYAM\`S<span class="brand-sub">GAMES LIST</span></span>`;
const originalIcon="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='10' fill='%23cefa69'/%3E%3Ctext x='10' y='29' font-family='Arial' font-weight='900' font-size='28'%3ES%3C/text%3E%3C/svg%3E";
export const brand=brandDesign==='original'?originalBrand:`<span class="brand-emblem" aria-hidden="true">${checkpoint}</span><span class="brand-wordmark">SHIYAM’S<span class="brand-sub">GAMES LIST</span></span>`;
export function applyBrand(root){
 const header=root.querySelector('header .brand');if(header){header.innerHTML=brand;header.setAttribute('aria-label','Shiyam’s Games List');}
 const favicon=document.querySelector('link[rel="icon"]');if(favicon)favicon.href=brandDesign==='original'?originalIcon:checkpointIcon;
}
