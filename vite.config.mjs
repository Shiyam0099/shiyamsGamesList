import {defineConfig,loadEnv} from 'vite';
import {existsSync,readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'VITE_');
  const local=existsSync('keyfile.env')?parseEnv(readFileSync('keyfile.env','utf8')):{};
  for(const name of ['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY']) env[name]=process.env[name] ?? local[name] ?? env[name];
  const key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if(key){
    let isPublic=key.startsWith('sb_publishable_');
    if(key.split('.').length===3){try{isPublic=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='anon';}catch{isPublic=false;}}
    if(!isPublic)throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable or anon key. Refusing to bundle a server credential.');
  }
  return {
    appType:'spa',
    base:mode==='production'?'/shiyamsGamesList/':'/',
    define:Object.fromEntries(['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'].map(name=>['import.meta.env.'+name,JSON.stringify(env[name] || '')])),
    build:{outDir:'dist',sourcemap:false},
    server:{fs:{deny:['.env','.env.*','**/*.env','**/.git/**','**/supabase/**','**/scripts/**','**/games.js']}}
  };
});
