import {neon} from '@neondatabase/serverless';
import {readFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

if(!process.env.DATABASE_URL)throw new Error('A real test database is required');
const base=process.env.DATABASE_URL;
const admin=neon(base);
const schema='test_'+crypto.randomUUID().replaceAll('-','');
await admin.query(`CREATE SCHEMA ${schema}`);
try{
  const testUrl=base;const sql=neon(testUrl);
  for(const file of (await readdir('postgres')).filter(f=>f.endsWith('.sql')).sort()){
   const migration=await readFile('postgres/'+file,'utf8');
   await sql.transaction([sql.query("SELECT set_config('search_path',$1,true)",[schema]),...migration.split(';').map(s=>s.trim()).filter(Boolean).map(s=>sql.query(s))]);
  }
  const result=spawnSync(process.execPath,['--test','tests/api.integration.mjs'],{stdio:'inherit',env:{...process.env,DATABASE_URL:testUrl,TEST_DATABASE_SCHEMA:schema}});
  process.exitCode=result.status??1;
  if(result.status===0){const upgrade=spawnSync(process.execPath,['tests/postgres-migration.integration.mjs'],{stdio:'inherit',env:process.env});process.exitCode=upgrade.status??1;}
}finally{await admin.query(`DROP SCHEMA ${schema} CASCADE`);}
