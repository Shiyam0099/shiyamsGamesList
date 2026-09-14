import {readFile} from 'node:fs/promises';
import {required,serverURL,run} from './environment.mjs';
await run(async()=>{
 const project=new URL(serverURL()).hostname.split('.')[0];
 if(!/^[a-z0-9]{20}$/.test(project))throw {code:'INVALID_PROJECT'};
 const form=new FormData();form.append('metadata',JSON.stringify({name:'gaming-feed',entrypoint_path:'index.ts',verify_jwt:false}));
 for(const file of ['index.ts','feed-data.mjs'])form.append('file',new Blob([(await readFile(new URL('../supabase/functions/gaming-feed/'+file,import.meta.url),'utf8')).replaceAll('../_shared/content-policy.mjs','./content-policy.mjs')],{type:'application/javascript'}),file);
 form.append('file',new Blob([await readFile(new URL('../supabase/functions/_shared/content-policy.mjs',import.meta.url),'utf8')],{type:'application/javascript'}),'content-policy.mjs');
 const response=await fetch(`https://api.supabase.com/v1/projects/${project}/functions/deploy?slug=gaming-feed`,{method:'POST',headers:{Authorization:'Bearer '+required('SUPABASE_ACCESS_TOKEN')},body:form});
 if(!response.ok)throw {code:'DEPLOY_HTTP_'+response.status};
 const data=await response.json();if(data.verify_jwt!==false)throw {code:'FEED_JWT_CONFIGURATION'};
 console.log(`gaming-feed deployed (${data.status}). Free public publisher feeds; no additional API key.`);
});
