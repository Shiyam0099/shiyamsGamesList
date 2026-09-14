import {required,serverURL,run} from './environment.mjs';
await run(async()=>{
 for(const kind of ['news','reviews']){
  const response=await fetch(serverURL()+'/functions/v1/gaming-feed?kind='+kind,{headers:{apikey:required('VITE_SUPABASE_PUBLISHABLE_KEY')}});
  if(!response.ok)throw {code:'FEED_HTTP_'+response.status};
  const data=await response.json();if(!data.items?.length)throw {code:'EMPTY_'+kind.toUpperCase()};
  if(data.items.some(item=>item.kind!==kind || !item.url.startsWith('https://') || !item.source || !item.title))throw {code:'INVALID_FEED_ITEMS'};
  console.log(`${kind}: ${data.items.length} live articles from ${[...new Set(data.items.map(item=>item.source))].join(', ')}; partial=${data.partial}; updated=${data.updatedAt}`);
 }
});
