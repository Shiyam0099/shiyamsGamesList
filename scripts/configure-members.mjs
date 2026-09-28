import {required,serverURL,run} from './environment.mjs';
await run(async()=>{
 const project=new URL(serverURL()).hostname.split('.')[0],site=required('SITE_URL'),endpoint=`https://api.supabase.com/v1/projects/${project}/config/auth`;
 const headers={Authorization:'Bearer '+required('SUPABASE_ACCESS_TOKEN'),'Content-Type':'application/json'};
 const r=await fetch(endpoint,{headers});if(!r.ok)throw {code:'AUTH_READ_'+r.status};const config=await r.json();
 console.log(JSON.stringify({customSMTP:!!config.smtp_host,emailSignupEnabled:config.external_email_enabled,signupDisabled:config.disable_signup,emailConfirmationRequired:!config.mailer_autoconfirm}));
 if(!process.argv.includes('--apply'))return;
 const redirects=new Set((config.uri_allow_list||'').split(',').filter(Boolean));
 for(const base of [site.endsWith('/')?site:site+'/','http://127.0.0.1:5173/shiyamsGamesList/','http://127.0.0.1:4175/shiyamsGamesList/']){
  redirects.add(new URL('account',base).href);redirects.add(new URL('account?recovery=1',base).href);
 }
 const patch={site_url:site,uri_allow_list:[...redirects].join(','),external_email_enabled:true,disable_signup:false,mailer_autoconfirm:true,password_min_length:Math.max(config.password_min_length||6,12)};
 const saved=await fetch(endpoint,{method:'PATCH',headers,body:JSON.stringify(patch)});if(!saved.ok)throw {code:'AUTH_UPDATE_'+saved.status};
 console.log('Immediate email/password registration configured; email verification is not required.');
});
