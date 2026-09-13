export const basePath=import.meta.env.BASE_URL || '/';
export function localPath(path=location.pathname){return basePath!=='/' && path.startsWith(basePath)?'/'+path.slice(basePath.length):path;}
export function sitePath(path='/'){return basePath+path.replace(/^\//,'');}
export function normalizeLinks(root){
  root.querySelectorAll('a[href^="/"]').forEach(link=>{const path=link.getAttribute('href');if(basePath==='/' || !path.startsWith(basePath))link.setAttribute('href',sitePath(path));});
}
