import {neon} from '@neondatabase/serverless';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const admin=neon(process.env.DATABASE_URL);const schema='migration_'+crypto.randomUUID().replaceAll('-','');
await admin.query(`CREATE SCHEMA ${schema}`);
try{
 const client=neon(process.env.DATABASE_URL);const sql={query:async(text,values)=>(await client.transaction([client.query("SELECT set_config('search_path',$1,true)",[schema]),client.query(text,values)]))[1]};
 assert.equal((await sql.query('SELECT current_schema() AS schema'))[0].schema,schema);
 async function migrate(file){const source=await readFile(new URL('../postgres/'+file,import.meta.url),'utf8');await client.transaction([client.query("SELECT set_config('search_path',$1,true)",[schema]),...source.split(';').map(s=>s.trim()).filter(Boolean).map(s=>client.query(s))])}
 await migrate('0000_initial.sql');
 await sql.query("INSERT INTO profiles(id,name,course,semester,age,bio,interests,intent,photo,approved,consent_at,created_at) VALUES ('legacy','Original','Psicologia',3,22,'Bio','[]','Amizade','existing-private.png',0,'2026-01-01','2026-01-01')");
 await migrate('0001_profile_details.sql');await migrate('0001_profile_details.sql');
 const [row]=await sql.query("SELECT * FROM profiles WHERE id='legacy'");assert.equal(row.name,'Original');assert.equal(row.approved,0);assert.equal(row.photo,'existing-private.png');assert.equal(row.gender,'Prefiro não informar');assert.equal(row.age_min,18);assert.equal(row.age_max,100);assert.deepEqual(row.looking_for,[]);assert.deepEqual(row.prompts,[]);
 const gallery=await sql.query("SELECT slot,key FROM profile_photos WHERE profile_id='legacy'");assert.deepEqual(gallery,[{slot:0,key:'existing-private.png'}]);
 await sql.query("DELETE FROM profiles WHERE id='legacy'");assert.equal((await sql.query('SELECT * FROM profile_photos')).length,0);
 console.log('Postgres upgrade preserves legacy profiles, suspensions and private photos; reruns and cascades: OK');
}finally{await admin.query(`DROP SCHEMA ${schema} CASCADE`)}
