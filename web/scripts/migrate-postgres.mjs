import {neon} from '@neondatabase/serverless';
import {readFile} from 'node:fs/promises';

const sql=neon(process.env.DATABASE_URL);
const migration=await readFile(new URL('../postgres/0000_initial.sql',import.meta.url),'utf8');
await sql.transaction(migration.split(';').map(s=>s.trim()).filter(Boolean).map(s=>sql.query(s)));
console.log('Postgres schema ready. Existing rows preserved.');
