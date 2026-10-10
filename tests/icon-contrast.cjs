const assert=require('node:assert/strict');
// Light-theme glyphs must stay legible at rest, on hover, and with keyboard focus.
module.exports=async function checkIconContrast(page,label,selector='header .member-icon-control,.workspace-heading-icon'){
 const icons=page.locator(selector);
 for(let i=0;i<await icons.count();i++){
  const icon=icons.nth(i);if(!await icon.isVisible())continue;
  for(const state of ['rest','hover','focus']){
   if(state==='rest')await page.mouse.move(0,0);
   if(state==='hover')await icon.hover();
   if(state==='focus')await icon.focus();
   const result=await icon.evaluate(el=>{
    const style=getComputedStyle(el),glyph=getComputedStyle(el.querySelector('.ui-icon')||el);
    const rgb=value=>(value.match(/[\d.]+/g)||[]).map(Number);
    const lum=values=>values.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const bg=rgb(style.backgroundColor),fg=rgb(glyph.color),a=lum(bg),b=lum(fg);
    return {contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),opacity:bg[3]??1,background:style.backgroundColor,image:style.backgroundImage};
   });
   assert.equal(result.opacity,1,label+' '+state+' icon has an opaque light surface');
   assert.equal(result.image,'none',label+' '+state+' no dark glass overlay');
   assert.ok(result.contrast>=4.5,label+' '+state+' icon contrast '+JSON.stringify(result));
  }
  await icon.evaluate(el=>el.blur());
 }
};
