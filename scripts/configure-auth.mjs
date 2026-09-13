import {required,serverURL,run} from './environment.mjs';
await run(async()=>{
 const project=new URL(serverURL()).hostname.split('.')[0];
 const site=required('SITE_URL');const parsed=new URL(site);
 if(parsed.protocol!=='https:')throw {code:'INVALID_SITE_URL'};
 const endpoint=`https://api.supabase.com/v1/projects/${project}/config/auth`;
 const headers={Authorization:'Bearer '+required('SUPABASE_ACCESS_TOKEN'),'Content-Type':'application/json'};
 const current=await fetch(endpoint,{headers});if(!current.ok)throw {code:'AUTH_READ_HTTP_'+current.status};
 const config=await current.json();
 const redirects=new Set((config.uri_allow_list || '').split(',').filter(Boolean));
 redirects.add(new URL('admin/settings',site.endsWith('/')?site:site+'/').href);
 const update=await fetch(endpoint,{method:'PATCH',headers,body:JSON.stringify({site_url:site,uri_allow_list:[...redirects].join(',')})});
 if(!update.ok)throw {code:'AUTH_UPDATE_HTTP_'+update.status};
 console.log('Supabase Auth site URL and settings verification redirect configured; existing redirect entries preserved.');
});
