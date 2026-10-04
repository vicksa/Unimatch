import {createRequire} from 'node:module';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.resolve('wrangler'));const {build}=require('esbuild');
const root=process.cwd();
await build({entryPoints:['app/api/[...path]/route.ts'],outfile:'.sites-runtime/test-chat-api.mjs',bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'test-injections',setup(b){b.onResolve({filter:/^(@\/app\/auth|@\/lib\/photos|@\/db\/database)$/},()=>({path:path.join(root,'tests/runtime.mjs'),external:true}));b.onResolve({filter:/^@\//},a=>({path:path.join(root,a.path.replace('@/',''))+'.ts'}))}}]});
await build({entryPoints:['lib/chat-crypto.ts'],outfile:'.sites-runtime/chat-api-crypto.mjs',bundle:true,format:'esm',platform:'node'});
const route=await import('../.sites-runtime/test-chat-api.mjs');const {setUser,DB}=await import('./runtime.mjs');
const {createChatKey,encryptChatMessage,decryptChatMessage}=await import('../.sites-runtime/chat-api-crypto.mjs');
assert.equal((await DB.prepare('SELECT current_schema() AS schema').first()).schema,process.env.TEST_DATABASE_SCHEMA);
const ids=['e2e-alice','e2e-bob','e2e-carol'];
async function call(user,path,data){setUser(user);const req=new Request('https://test.invalid/api/'+path,{method:data===undefined?'GET':'POST',headers:{Origin:'https://test.invalid','Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const response=await(data===undefined?route.GET(req):route.POST(req));return {status:response.status,body:await response.json()};}
const registration=setup=>({keyId:setup.local.keyId,encryptionPublicKey:setup.local.encryptionPublicKey,signingPublicKey:setup.local.signingPublicKey,backup:setup.backup});
test('encrypted API, history conversion and identity boundaries',async t=>{
 for(const user of ids)assert.equal((await call(user,'profile',{name:user,course:'Psicologia',semester:3,age:22,bio:'',interests:['Jogos'],intent:'Amizade',consent:true})).status,200);
 const [alice,bob,carol]=await Promise.all(ids.map(createChatKey));const keys=[alice.local,bob.local];
 for(const setup of [alice,bob,carol])assert.equal((await call(setup.local.userId,'chat-key',registration(setup))).status,200);
 await call(ids[0],'react',{target:ids[1],kind:'like'});await call(ids[1],'react',{target:ids[0],kind:'like'});
 const match=(await call(ids[0],'matches')).body.matches.find(m=>m.peer===ids[1]).id;
 let context=(await call(ids[0],'chat-keys?match='+encodeURIComponent(match))).body.context;
 const secret='Somente as duas pessoas podem abrir este conteúdo.';
 const first=await encryptChatMessage(alice.local,keys,match,secret,context);
 await t.test('private backup belongs to the authenticated account and keys cannot be overwritten',async()=>{
  assert.equal((await call(null,'chat-key')).status,401);
  assert.equal((await call(ids[0],'chat-key',registration(bob))).status,409);
  assert.equal((await call(ids[0],'chat-key',{...registration(alice),userId:ids[1]})).status,400);
  assert.equal((await call(ids[2],'chat-keys?match='+encodeURIComponent(match))).status,404);
  assert.equal((await call(ids[1],'chat-key?user='+ids[0])).body.chatKey.userId,ids[1]);
  assert.ok((await call(ids[0],'chat-keys?match='+encodeURIComponent(match))).body.keys.every(key=>!('backup'in key)));
 });
 await t.test('plaintext, altered ciphertext, forged sender and wrong recipients are rejected',async()=>{
  assert.equal((await call(ids[0],'messages',{match,body:secret})).status,400);
  const tampered={...first,ciphertext:(first.ciphertext[0]==='A'?'B':'A')+first.ciphertext.slice(1)};
  assert.equal((await call(ids[0],'messages',{match,envelope:tampered})).status,400);
  assert.equal((await call(ids[1],'messages',{match,envelope:first})).status,400);
  const wrong=await encryptChatMessage(alice.local,[alice.local,carol.local],match,secret,context);
  assert.equal((await call(ids[0],'messages',{match,envelope:wrong})).status,400);
  assert.equal((await call(ids[0],'messages',{match,envelope:first})).status,200);
  const stored=await DB.prepare('SELECT body,encryption_version,envelope FROM messages WHERE id=?').bind(first.id).first();
  assert.equal(stored.body,'');assert.equal(stored.encryption_version,1);assert.equal(JSON.stringify(stored).includes(secret),false);
  assert.equal(await decryptChatMessage(bob.local,alice.local,match,ids[0],stored.envelope,context),secret);
 });
 await t.test('unmatch revokes access and old ciphertext cannot replay into a new match instance',async()=>{
  const old=context;await call(ids[0],'unmatch',{match});
  assert.equal((await call(ids[1],'messages?match='+encodeURIComponent(match))).status,404);
  await call(ids[0],'react',{target:ids[1],kind:'like'});await call(ids[1],'react',{target:ids[0],kind:'like'});
  context=(await call(ids[0],'chat-keys?match='+encodeURIComponent(match))).body.context;
  assert.notEqual(context,old);assert.equal((await call(ids[0],'messages',{match,envelope:first})).status,400);
  const fresh=await encryptChatMessage(alice.local,keys,match,secret,context);
  assert.equal((await call(ids[0],'messages',{match,envelope:fresh})).status,200);
  assert.equal((await call(ids[0],'messages',{match,envelope:fresh})).status,200);
  assert.equal((await call(ids[0],'messages?match='+encodeURIComponent(match))).body.messages.length,1);
  const reuse=await encryptChatMessage(alice.local,keys,match,'Mudança não permitida',context,fresh.id);
  assert.equal((await call(ids[0],'messages',{match,envelope:reuse})).status,409);
 });
 await t.test('only the original sender can convert old messages; authenticated conversion removes plaintext',async()=>{
  const a=crypto.randomUUID(),b=crypto.randomUUID();
  await DB.prepare('INSERT INTO messages(id,match_id,sender,body,created_at) VALUES (?,?,?,?,?)').bind(a,match,ids[0],'Antiga Alice','now').run();
  await DB.prepare('INSERT INTO messages(id,match_id,sender,body,created_at) VALUES (?,?,?,?,?)').bind(b,match,ids[1],'Antiga Bob','now').run();
  const own=(await call(ids[0],'message-legacy?match='+encodeURIComponent(match))).body.messages;assert.equal(own.length,1);assert.equal(own[0].id,a);
  const forged=await encryptChatMessage(bob.local,keys,match,'Antiga Alice',context,a);
  assert.deepEqual((await call(ids[1],'message-upgrade',{match,envelopes:[forged]})).body.upgraded,[]);
  assert.equal((await DB.prepare('SELECT body FROM messages WHERE id=?').bind(a).first()).body,'Antiga Alice');
  const valid=await encryptChatMessage(alice.local,keys,match,'Antiga Alice',context,a);
  assert.deepEqual((await call(ids[0],'message-upgrade',{match,envelopes:[valid]})).body.upgraded,[a]);
  const stored=await DB.prepare('SELECT body,envelope,legacy_migrated FROM messages WHERE id=?').bind(a).first();assert.equal(stored.body,'');assert.equal(stored.legacy_migrated,1);
  assert.equal(await decryptChatMessage(bob.local,alice.local,match,ids[0],stored.envelope,context),'Antiga Alice');
  assert.equal((await call(ids[2],'message-upgrade',{match,envelopes:[valid]})).status,404);
  const exported=(await call(ids[0],'export')).body;assert.ok(exported.messages.every(message=>message.body===''));assert.equal(exported.chatKey.userId,ids[0]);assert.equal(JSON.stringify(exported).includes(alice.recoveryCode),false);
 });
 await t.test('blocking revokes key directory and account deletion removes its encrypted key backup',async()=>{
  await call(ids[0],'block',{target:ids[1]});assert.equal((await call(ids[1],'chat-keys?match='+encodeURIComponent(match))).status,404);
  await call(ids[0],'delete',{confirm:'EXCLUIR'});assert.equal((await DB.prepare('SELECT user_id FROM chat_keys WHERE user_id=?').bind(ids[0]).all()).results.length,0);
 });
});
