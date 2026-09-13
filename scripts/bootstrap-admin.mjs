import {createClient} from '@supabase/supabase-js';
import {required,serverURL,run} from './environment.mjs';
await run(async()=>{
 const client=createClient(serverURL(),required('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
 const email=required('SUPER_ADMIN_EMAIL').trim(), username=required('SUPER_ADMIN_USERNAME').trim();
 if(!/^[A-Za-z0-9_ .-]{2,40}$/.test(username))throw new Error('Invalid username');
 const {data:existing,error:lookupError}=await client.from('admin_profiles').select('email').eq('role','super_admin');if(lookupError)throw lookupError;
 if(existing.length){if(existing[0].email.toLowerCase()!==email.toLowerCase())throw new Error('A different Super Admin exists');console.log('The single Super Admin is already configured.');return;}
 // Reuse an existing Auth account without resetting its password.
 let user;for(let page=1;;page++){const {data,error}=await client.auth.admin.listUsers({page,perPage:1000});if(error)throw error;user=data.users.find(u=>u.email?.toLowerCase()===email.toLowerCase());if(user || data.users.length<1000)break;}
 let created=false;
 if(!user){const password=required('SUPER_ADMIN_PASSWORD');if(password.length<12)throw new Error('Use at least 12 characters');const {data,error}=await client.auth.admin.createUser({email,password,email_confirm:true});if(error)throw error;user=data.user;created=true;}
 const {error}=await client.rpc('bootstrap_super_admin',{user_id:user.id,display_name:username});
 if(error){if(created)await client.auth.admin.deleteUser(user.id);throw error;}
 console.log('Single active Super Admin configured. Sign in at /admin/login.');
});
