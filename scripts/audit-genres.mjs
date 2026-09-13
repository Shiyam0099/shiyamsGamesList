import {database,run} from './environment.mjs';
await run(async()=>{const db=await database();try{const result=await db.query('select genre,count(*)::int as games from public.games cross join lateral unnest(genres) as genre group by genre order by genre');console.log(JSON.stringify(result.rows,null,2));}finally{await db.end();}});
