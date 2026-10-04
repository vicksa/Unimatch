import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
test('release pending profiles while retaining audited suspensions, including tied timestamps',()=>{
 const db=new DatabaseSync(':memory:');
 try {
 db.exec(readFileSync('drizzle/0000_stale_random.sql','utf8'));
 const add=db.prepare("INSERT INTO profiles(id,name,course,semester,age,bio,interests,intent,consent_at,created_at,approved) VALUES (?,?,'Outro curso',1,22,'','[]','Amizade','now','now',0)");
 for(const id of ['pending','suspended','restored','suspended-again'])add.run(id,id);
 const audit=db.prepare("INSERT INTO audit VALUES (?,'moderator',?,?,'2026-10-04T00:00:00Z')");
 audit.run('1','suspend','suspended');audit.run('2','suspend','restored');audit.run('3','approve','restored');audit.run('4','approve','suspended-again');audit.run('5','suspend','suspended-again');
 const migration=readFileSync('drizzle/0001_remove_academic_approval.sql','utf8');db.exec(migration);db.exec(migration);
 for(const [id,active] of [['pending',1],['suspended',0],['restored',1],['suspended-again',0]])assert.equal(db.prepare('SELECT approved FROM profiles WHERE id=?').get(id).approved,active);
 } finally {db.close()}
});
