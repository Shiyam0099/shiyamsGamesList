import {existsSync} from 'node:fs';
// These files are ignored by Git and never imported by browser modules.
for(const file of ['keyfile.env','.env']) if(existsSync(file)) process.loadEnvFile(file);
export function required(name){const value=process.env[name];if(!value)throw new Error(`Set ${name} in your local environment.`);return value;}
export function serverURL(){return process.env.SUPABASE_URL || required('VITE_SUPABASE_URL');}
export async function database(){const {default:pg}=await import('pg');pg.types.setTypeParser(1082,value=>value);const client=new pg.Client({connectionString:required('SUPABASE_DB_URL'),connectionTimeoutMillis:15000});await client.connect();return client;}
export async function run(task){try{await task();}catch(error){console.error(error.message?.startsWith('Set ')?error.message:`Setup failed (${error.code || 'connection or validation error'}). Check configuration; no credentials have been printed.`);process.exitCode=1;}}
