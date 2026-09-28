import {readFile} from 'node:fs/promises';
import {required,serverURL,run} from './environment.mjs';
await run(async()=>{
 const project=new URL(serverURL()).hostname.split('.')[0];if(!/^[a-z0-9]{20}$/.test(project))throw {code:'INVALID_PROJECT'};
 const headers={Authorization:'Bearer '+required('SUPABASE_ACCESS_TOKEN')};
 const form=new FormData();form.append('metadata',JSON.stringify({name:'game-metadata',entrypoint_path:'index.ts',verify_jwt:false}));
 for(const file of ['index.ts','metadata.mjs'])form.append('file',new Blob([(await readFile(new URL('../supabase/functions/game-metadata/'+file,import.meta.url),'utf8')).replaceAll('../_shared/content-policy.mjs','./content-policy.mjs')],{type:'application/javascript'}),file);
 form.append('file',new Blob([await readFile(new URL('../supabase/functions/_shared/content-policy.mjs',import.meta.url),'utf8')],{type:'application/javascript'}),'content-policy.mjs');
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/functions/deploy?slug=game-metadata`,{method:'POST',headers,body:form});if(!r.ok)throw {code:'METADATA_DEPLOY_'+r.status};
 console.log('game-metadata deployed. Active-admin JWT checks and RLS-protected updates enabled.');
});
