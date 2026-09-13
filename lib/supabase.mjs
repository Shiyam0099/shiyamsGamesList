import {createClient} from '@supabase/supabase-js';
let client;
export function getSupabase() {
  if(client) return client;
  const url=import.meta.env.VITE_SUPABASE_URL;
  const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if(!url || !key) throw new Error('The collection connection is not configured.');
  let secret=key.startsWith('sb_secret_');
  if(key.split('.').length===3) {try {secret ||= JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role!=='anon';}catch {secret=true;}}
  if(secret || (!key.startsWith('sb_publishable_') && key.split('.').length!==3)) throw new Error('A public Supabase key is required.');
  client=createClient(url,key);
  return client;
}
