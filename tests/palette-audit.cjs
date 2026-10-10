// Check hidden/loading states and pseudo-elements too; image pixels and
// intentional theme preview swatches are not interface accents.
module.exports=async function auditPalette(page,label){
   const leaks=await page.evaluate(()=>{
    const found=new Set();
    for(const el of document.querySelectorAll('body *')){
     if(el.closest('.palette-swatch'))continue;
     for(const pseudo of [null,'::before','::after']){
      const s=getComputedStyle(el,pseudo);
      if(pseudo&&s.content==='none')continue;
      for(const prop of ['color','backgroundColor','backgroundImage','borderTopColor','borderRightColor','borderBottomColor','borderLeftColor','boxShadow','textShadow','outlineColor','fill','stroke']){
       for(const match of s[prop].matchAll(/rgba?\(([^)]+)\)/g)){
        const [r,g,b,a=1]=match[1].split(/[, /]+/).map(Number),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
        if(a<.04||d<20||max<64)continue;
        const sat=d/(255-Math.abs(max+min-255));
        let h=(max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4)*60;
        if(h>=65&&h<=170&&sat>.2)found.add((el.id?'#'+el.id:el.tagName.toLowerCase()+'.'+[...el.classList].join('.'))+(pseudo||'')+' '+prop+': '+s[prop]);
       }
      }
     }
    }
    return [...found];
   });
   require('node:assert/strict').deepEqual(leaks,[],label+' has no inherited green UI accents');
  };
