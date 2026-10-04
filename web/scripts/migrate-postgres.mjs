import {neon} from '@neondatabase/serverless';
import {readFile,readdir} from 'node:fs/promises';

const sql=neon(process.env.DATABASE_URL);
for(const file of (await readdir(new URL('../postgres/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()){
 const migration=await readFile(new URL('../postgres/'+file,import.meta.url),'utf8');
 await sql.transaction(migration.split(';').map(s=>s.trim()).filter(Boolean).map(s=>sql.query(s)));
}
console.log('Postgres schema ready. Existing rows preserved.');
