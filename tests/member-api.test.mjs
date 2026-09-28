import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {metadata} from '../supabase/functions/game-metadata/metadata.mjs';
import {excludedExternalContent} from '../supabase/functions/_shared/content-policy.mjs';
import {normalizeGenres} from '../lib/genres.mjs';
const source=stripTypeScriptTypes((await readFile(new URL('../supabase/functions/member-api/index.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,''));
test('member API authenticates every action, imports server metadata, protects admins and never emails password resets',async()=>{
 let handler,valid=true,active=true,admin=null,protectedTarget=false,limited=false,existing=false,fetches=0,imported,authChanges=[],audits=[];
 const id='00000000-0000-0000-0000-000000000001',target='00000000-0000-0000-0000-000000000002';
 const db={auth:{getUser:async()=>({data:{user:valid?{id,email_confirmed_at:'2026-09-28'}:null}}),admin:{getUserById:async()=>({data:{user:{id:target,email:'member@example.test'}}}),updateUserById:async(...args)=>{authChanges.push(args);return {};},deleteUser:async()=>({})}},rpc:async(name,args)=>{if(name==='member_api_limit')return limited?{error:{}}:{};if(name==='import_member_game')imported=args;return {data:42};},from:table=>{
  let filters={};const query={select(){return query;},eq(k,v){filters[k]=v;return query;},ilike(){return query;},order(){return query;},limit(){return query;},range(){return query;},upsert:async()=>({}),update(){return query;},insert:async data=>{audits.push(data);return {};},maybeSingle:async()=>({data:table==='member_profiles'?{is_active:active}:table==='admin_profiles'?(filters.id===target?(protectedTarget?{id:target}:null):admin):table==='games'?(existing?{id:42}:null):null}),then(resolve){return Promise.resolve({data:[],error:null}).then(resolve);}};return query;
 }};
 vm.runInNewContext(source,{Request,Response,URLSearchParams,AbortSignal,createClient:()=>db,metadata,excludedExternalContent,normalizeGenres,fetch:async()=>{fetches++;return new Response(JSON.stringify({id:77,name:'Server title',released:'2026-09-20',genres:[{name:'Action'}]}));},Deno:{env:{get:k=>k==='ADMIN_ORIGIN'?'https://example.test':'server-secret'},serve:fn=>handler=fn}});
 const invoke=(body,token='Bearer test',origin='https://example.test')=>handler(new Request('https://project/member-api',{method:'POST',headers:{Authorization:token,Origin:origin},body:JSON.stringify(body)}));
 assert.equal((await invoke({action:'search'},'')).status,401);valid=false;assert.equal((await invoke({action:'search'})).status,401);valid=true;active=false;assert.equal((await invoke({action:'search'})).status,403);active=true;assert.equal((await invoke({action:'search'},undefined,'https://bad.test')).status,403);assert.equal(fetches,0);
 assert.equal((await invoke({action:'reset-password',userId:target,password:'test-password-123'})).status,403);assert.equal(authChanges.length,0);
 assert.equal((await invoke({action:'import',rawgId:'../secrets'})).status,400);
 assert.equal((await invoke({action:'import',rawgId:77,details:{title:'Malicious override'},target})).status,200);assert.equal(imported.target,id);assert.equal(imported.details.title,'Server title');
 existing=true;await invoke({action:'import',rawgId:77});assert.equal(fetches,1);
 limited=true;assert.equal((await invoke({action:'import',rawgId:77})).status,429);limited=false;
 admin={is_active:true,role:'admin'};protectedTarget=true;assert.equal((await invoke({action:'delete',userId:target})).status,403);protectedTarget=false;
 assert.equal((await invoke({action:'reset-password',userId:target,password:'short'})).status,400);
 const response=await invoke({action:'reset-password',userId:target,password:'temporary-password-123'});assert.equal(response.status,200);assert.equal(authChanges[0][1].password,'temporary-password-123');assert.ok(!JSON.stringify(audits).includes('temporary-password'));assert.ok(!(await response.text()).includes('temporary-password'));
 await invoke({action:'block',userId:target});assert.equal(authChanges[1][1].ban_duration,'876000h');
 admin.is_active=false;assert.equal((await invoke({action:'members'})).status,403);
});
