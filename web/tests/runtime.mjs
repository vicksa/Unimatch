import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');sqlite.exec(readFileSync('drizzle/0000_stale_random.sql','utf8'));
export const DB={prepare(sql){let args=[];const stmt={bind(...a){args=a;return stmt},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){sqlite.prepare(sql).run(...args);return {success:true}}};return stmt},async batch(stmts){sqlite.exec('BEGIN');try{const r=[];for(const s of stmts)r.push(await s.run());sqlite.exec('COMMIT');return r}catch(e){sqlite.exec('ROLLBACK');throw e}}};
export const files=new Map();
export const env={DB,ADMIN_USER_ID:'moderator',BUCKET:{async put(k,b){files.set(k,b)},async delete(k){files.delete(k)},async get(k){const b=files.get(k);return b?{body:b}:null}}};
let current=null;export function setUser(id){current=id?{userId:id,email:id+'@test.invalid',fullName:id}:null}export async function getChatGPTUser(){return current}
