import {readFile} from 'node:fs/promises';
import {required,serverURL,run} from './environment.mjs';
await run(async()=>{
 const project=new URL(serverURL()).hostname.split('.')[0],form=new FormData();
 form.append('metadata',JSON.stringify({name:'member-api',entrypoint_path:'index.ts',verify_jwt:false}));
 for(const [file,path] of [['index.ts','supabase/functions/member-api/index.ts'],['metadata.mjs','supabase/functions/game-metadata/metadata.mjs'],['content-policy.mjs','supabase/functions/_shared/content-policy.mjs'],['genres.mjs','lib/genres.mjs']]){
  const content=(await readFile(new URL('../'+path,import.meta.url),'utf8')).replaceAll('../game-metadata/metadata.mjs','./metadata.mjs').replaceAll('../_shared/content-policy.mjs','./content-policy.mjs').replaceAll('../../../lib/genres.mjs','./genres.mjs');
  form.append('file',new Blob([content],{type:'application/javascript'}),file);
 }
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/functions/deploy?slug=member-api`,{method:'POST',headers:{Authorization:'Bearer '+required('SUPABASE_ACCESS_TOKEN')},body:form});
 if(!r.ok)throw {code:'MEMBERS_DEPLOY_'+r.status};console.log('Member API deployed.');
});
