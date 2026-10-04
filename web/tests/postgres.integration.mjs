import {neon} from '@neondatabase/serverless';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';

if(!process.env.DATABASE_URL)throw new Error('A real test database is required');
const base=process.env.DATABASE_URL;
const admin=neon(base);
const schema='test_'+crypto.randomUUID().replaceAll('-','');
await admin.query(`CREATE SCHEMA ${schema}`);
try{
  const url=new URL(base);url.searchParams.set('options',`-c search_path=${schema}`);
  const testUrl=url.toString();
  const sql=neon(testUrl);
  const migration=await readFile('postgres/0000_initial.sql','utf8');
  await sql.transaction(migration.split(';').map(s=>s.trim()).filter(Boolean).map(s=>sql.query(s)));
  const result=spawnSync(process.execPath,['--test','tests/api.integration.mjs'],{stdio:'inherit',env:{...process.env,DATABASE_URL:testUrl}});
  process.exitCode=result.status??1;
}finally{await admin.query(`DROP SCHEMA ${schema} CASCADE`);}
