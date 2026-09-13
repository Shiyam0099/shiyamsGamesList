import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
// JWT verification is performed explicitly below, including a fresh active-role lookup.
Deno.serve(async(request:Request)=>{
 const origin=Deno.env.get('ADMIN_ORIGIN');
 const headers={'Access-Control-Allow-Origin':origin || '', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Content-Type':'application/json'};
 const respond=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(!origin || request.headers.get('Origin')!==origin)return respond(403,{error:'Origin not allowed.'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return respond(405,{error:'Use POST.'});
 const authorization=request.headers.get('Authorization');
 if(!authorization?.startsWith('Bearer '))return respond(401,{error:'Sign in to continue.'});
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:{user},error:authError}=await client.auth.getUser(authorization.slice(7));
  if(authError || !user)return respond(401,{error:'Sign in again to continue.'});
  const {data:actor,error:profileError}=await client.from('admin_profiles').select('role,is_active').eq('id',user.id).single();
  if(profileError || actor?.role!=='super_admin' || !actor.is_active)return respond(403,{error:'Only the active Super Admin can manage accounts.'});
  const body=await request.json();
  if(body.role && body.role!=='admin')return respond(400,{error:'Only ordinary admin accounts can be created.'});
  if(body.action==='create'){
   const username=typeof body.username==='string'?body.username.trim():'';
   const email=typeof body.email==='string'?body.email.trim():'';
   if(!/^[A-Za-z0-9_ .-]{2,40}$/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254 || typeof body.password!=='string' || body.password.length<12 || body.password.length>256)return respond(400,{error:'Enter a valid username, email, and password of 12–256 characters.'});
   const {data:created,error}=await client.auth.admin.createUser({email,password:body.password,email_confirm:true});
   if(error)return respond(400,{error:'Account creation failed. Check for an existing email and the password requirements.'});
   const {error:insertError}=await client.from('admin_profiles').insert({id:created.user.id,email:created.user.email,username,role:'admin',is_active:true});
   if(insertError){await client.auth.admin.deleteUser(created.user.id);return respond(409,{error:'The username could not be saved. Choose a unique username and try again.'});}
   return respond(201,{success:true});
  }
  if(body.action==='delete'){
   if(typeof body.userId!=='string' || !/^[0-9a-f-]{36}$/i.test(body.userId))return respond(400,{error:'Choose an admin account.'});
   const {data:target,error}=await client.from('admin_profiles').select('role').eq('id',body.userId).single();
   if(error || target?.role!=='admin' || body.userId===user.id)return respond(403,{error:'This account cannot be deleted.'});
   const {error:deleteError}=await client.auth.admin.deleteUser(body.userId);
   if(deleteError)return respond(400,{error:'Account deletion failed. Try deactivating the account instead.'});
   return respond(200,{success:true});
  }
  return respond(400,{error:'Unsupported action.'});
 }catch{return respond(500,{error:'User management is temporarily unavailable. Try again.'});}
});
