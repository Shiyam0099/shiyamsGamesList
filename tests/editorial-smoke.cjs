const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE || undefined,headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const site=process.env.SITE_URL || 'http://127.0.0.1:4175/shiyamsGamesList';let fail=false,empty=false,requests=0;
 await page.route('**/functions/v1/gaming-feed**',route=>{
  requests++;if(fail)return route.fulfill({status:503,contentType:'application/json',body:'{"error":"Unavailable"}'});
  const kind=new URL(route.request().url()).searchParams.get('kind');
  const items=Array.from({length:14},(_,i)=>({id:String(i),title:`${kind==='reviews'?'Review':'News'} headline ${i}`,url:`https://www.gamespot.com/articles/story-${i}/`,image:'',excerpt:'A short publisher excerpt.',source:i%2?'PC Gamer':'GameSpot',publishedAt:new Date(Date.UTC(2026,8,13,i)).toISOString(),author:'Editorial team',kind}));
  return route.fulfill({contentType:'application/json',body:JSON.stringify({items:empty?[]:items,updatedAt:new Date().toISOString(),partial:false})});
 });
 await page.goto(site+'/news',{waitUntil:'domcontentloaded'});await page.locator('.article-card').first().waitFor();
 assert.equal(await page.locator('.article-card').count(),12);assert.match(await page.locator('.article-card h2').first().textContent(),/13/);
 await page.getByRole('button',{name:'Load more stories',exact:true}).click();assert.equal(await page.locator('.article-card').count(),14);
 await page.locator('#article-search').fill('headline 13');assert.equal(await page.locator('.article-card').count(),1);
 await page.locator('#article-source').selectOption('GameSpot');await page.getByText('No matching headlines',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Clear filters'}).click();await page.locator('#article-source').selectOption('PC Gamer');assert.equal(await page.locator('.article-card').count(),7);
 await page.locator('#article-source').selectOption('');
 for(const link of await page.locator('.article-card h2 a').evaluateAll(nodes=>nodes.map(a=>({target:a.target,rel:a.rel})))){assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');}
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Editorial overflow at ${width}`);}
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/private/tmp/shiyams-news.png'});
 await page.getByRole('link',{name:'Latest Reviews',exact:true}).click();await page.locator('.article-card').first().waitFor();assert.match(await page.locator('.article-card h2').first().textContent(),/^Review/);
 fail=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByText('Showing saved articles. Live updates are temporarily unavailable.').waitFor();assert.equal(await page.locator('.article-card').count(),12);
 await page.evaluate(()=>sessionStorage.clear());await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
 fail=false;empty=true;await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByText('No articles available yet',{exact:true}).waitFor();
 empty=false;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.locator('.article-card').first().waitFor();
 assert.ok(requests>=5);assert.deepEqual(errors,[]);console.log('PASS: news/reviews routes, latest-first ordering, filtering, pagination, source links, caching, errors, empty states and mobile layouts.');await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
