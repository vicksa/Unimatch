import {database as createDatabase} from '../db/database.ts';
if(!/^test_[a-f0-9]+$/.test(process.env.TEST_DATABASE_SCHEMA||''))throw new Error('Tests require an isolated schema');
export const database=()=>createDatabase(process.env.TEST_DATABASE_SCHEMA);
export const DB=database();
export const files=new Map();
export const photos={async put(k,b){files.set(k,b)},async delete(k){files.delete(k)},async get(k){const b=files.get(k);return b?{body:b}:null}};
process.env.ADMIN_USER_ID='moderator';
export const env={get ADMIN_USER_ID(){return process.env.ADMIN_USER_ID},set ADMIN_USER_ID(v){if(v)process.env.ADMIN_USER_ID=v;else delete process.env.ADMIN_USER_ID}};
let current=null;export function setUser(id){current=id?{userId:id,email:id+'@test.invalid',fullName:id}:null}export async function getUser(){return current}
