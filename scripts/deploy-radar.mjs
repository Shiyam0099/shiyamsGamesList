import {readFile} from 'node:fs/promises';
import {required,serverURL,run} from './environment.mjs';
await run(async()=>{
 const project=new URL(serverURL()).hostname.split('.')[0];if(!/^[a-z0-9]{20}$/.test(project))throw {code:'INVALID_PROJECT'};
 const headers={Authorization:'Bearer '+required('SUPABASE_ACCESS_TOKEN')};
 const secrets=await fetch(`https://api.supabase.com/v1/projects/${project}/secrets`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify([{name:'RAWG_API_KEY',value:required('RAWG_API_KEY')}])});
 if(!secrets.ok)throw {code:'RADAR_SECRET_HTTP_'+secrets.status};
 const form=new FormData();form.append('metadata',JSON.stringify({name:'gaming-radar',entrypoint_path:'index.ts',verify_jwt:false}));
 for(const file of ['index.ts','radar-data.mjs'])form.append('file',new Blob([(await readFile(new URL('../supabase/functions/gaming-radar/'+file,import.meta.url),'utf8')).replaceAll('../_shared/content-policy.mjs','./content-policy.mjs')],{type:'application/javascript'}),file);
 form.append('file',new Blob([await readFile(new URL('../supabase/functions/_shared/content-policy.mjs',import.meta.url),'utf8')],{type:'application/javascript'}),'content-policy.mjs');
 const response=await fetch(`https://api.supabase.com/v1/projects/${project}/functions/deploy?slug=gaming-radar`,{method:'POST',headers,body:form});
 if(!response.ok)throw {code:'RADAR_DEPLOY_HTTP_'+response.status};
 console.log('gaming-radar deployed. RAWG key stored only as an Edge Function secret.');
});
