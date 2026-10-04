import {createRequire} from 'node:module';const require=createRequire(import.meta.resolve('wrangler'));const {build}=require('esbuild');import path from 'node:path';import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const root=process.cwd();await build({entryPoints:['app/api/[...path]/route.ts'],outfile:'.sites-runtime/test-api.mjs',bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'test-injections',setup(b){b.onResolve({filter:/^(@\/app\/auth|@\/lib\/photos)$/},()=>({path:path.join(root,'tests/runtime.mjs'),external:true}));b.onResolve({filter:/^@\//},a=>({path:path.join(root,a.path.replace('@/',''))+'.ts'}))}}]});
const route=await import('../.sites-runtime/test-api.mjs');const {setUser,DB,files,env}=await import('./runtime.mjs');
async function call(user,path,data,origin='https://test.invalid'){setUser(user);const req=new Request('https://test.invalid/api/'+path,{method:data===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const r=await(data===undefined?route.GET(req):route.POST(req));return {status:r.status,body:await r.json()}}
const p=name=>({name,course:'Engenharia de Software',semester:6,age:22,bio:'Olá',interests:['Games'],intent:'Conhecer pessoas',consent:true});
test('full API flows and security boundaries',async t=>{
await t.test('anonymous denied',async()=>assert.equal((await call(null,'me')).status,401));
await t.test('cross-origin write denied',async()=>assert.equal((await call('alice','profile',p('Alice'),'https://evil.invalid')).status,403));
await t.test('minor and privilege injection rejected',async()=>{assert.equal((await call('alice','profile',{...p('Alice'),age:17})).status,400);assert.equal((await call('alice','profile',{...p('Alice'),approved:1})).status,400)});
await t.test('profile is active immediately without a configured moderator',async()=>{const admin=env.ADMIN_USER_ID;env.ADMIN_USER_ID=undefined;try{assert.equal((await call('alice','profile',p('Alice'))).status,200);assert.equal((await call('alice','me')).body.profile.approved,1);assert.equal((await call('alice','discover')).status,200);assert.equal((await call('alice','admin')).status,403)}finally{env.ADMIN_USER_ID=admin}});
for(const [id,name]of [['bob','Bob'],['mallory','Mallory'],['moderator','Moderator']])await call(id,'profile',p(name));
await t.test('only configured moderator manages suspensions',async()=>{assert.equal((await call('alice','admin',{target:'alice',action:'approve'})).status,403);for(const id of ['alice','bob','mallory'])assert.equal((await call('moderator','admin',{target:id,action:'approve'})).status,200)});
await t.test('private fields excluded from discovery',async()=>{const r=await call('alice','discover');assert.equal(r.status,200);assert.equal(r.body.profiles.length,3);assert.equal('consent_at'in r.body.profiles[0],false);assert.equal('email'in r.body.profiles[0],false)});
let match;
await t.test('one-sided like cannot open chat; mutual match created once',async()=>{assert.equal((await call('alice','react',{target:'bob',kind:'like'})).body.match,false);assert.equal((await call('bob','matches')).body.matches.length,0);assert.equal((await call('bob','react',{target:'alice',kind:'like'})).body.match,true);await call('bob','react',{target:'alice',kind:'like'});const r=await call('alice','matches');assert.equal(r.body.matches.length,1);match=r.body.matches[0].id});
await t.test('nonparticipant cannot read or send messages',async()=>{assert.equal((await call('mallory','messages?match='+encodeURIComponent(match))).status,404);assert.equal((await call('mallory','messages',{match,body:'Spy'})).status,404)});
await t.test('message persisted and HTML remains plain data',async()=>{assert.equal((await call('alice','messages',{match,body:'<script>alert(1)</script>'})).status,200);assert.equal((await call('bob','messages?match='+encodeURIComponent(match))).body.messages[0].body,'<script>alert(1)</script>')});
await t.test('pause hides discovery and blocks new likes',async()=>{await call('mallory','pause',{paused:true});assert.equal((await call('alice','react',{target:'mallory',kind:'like'})).status,404);assert.equal((await call('bob','discover')).body.profiles.some(x=>x.id==='mallory'),false);await call('mallory','pause',{paused:false})});
await t.test('report visible to moderator only',async()=>{assert.equal((await call('alice','report',{target:'bob',reason:'Teste de denúncia'})).status,200);assert.equal((await call('moderator','admin')).body.reports.length,1);assert.equal((await call('bob','admin')).status,403)});
await t.test('upload rejects disguised file and requires owner',async()=>{setUser('alice');let r=await route.POST(new Request('https://test.invalid/api/photo',{method:'POST',headers:{Origin:'https://test.invalid','Content-Type':'image/png'},body:'<script>bad</script>'}));assert.equal(r.status,400);const b=await readFile('public/icon-192.png');r=await route.POST(new Request('https://test.invalid/api/photo',{method:'POST',headers:{Origin:'https://test.invalid','Content-Type':'image/png'},body:b}));assert.equal(r.status,200);assert.equal(files.size,1);setUser('bob');const photo=await route.GET(new Request('https://test.invalid/api/photo/alice'));assert.equal(photo.status,200);assert.equal(photo.headers.get('Cache-Control'),'private, no-store')});
await t.test('unmatch revokes chat and requires new consent from both participants',async()=>{
assert.equal((await call('alice','unmatch',{match})).status,200);
assert.equal((await call('alice','matches')).body.matches.length,0);
assert.equal((await call('bob','messages?match='+encodeURIComponent(match))).status,404);
assert.equal((await call('bob','react',{target:'alice',kind:'like'})).body.match,false);
assert.equal((await call('bob','messages',{match,body:'Old consent'})).status,404);
assert.equal((await call('alice','react',{target:'bob',kind:'like'})).body.match,true);
assert.equal((await call('alice','matches')).body.matches.length,1);
assert.equal((await call('alice','messages?match='+encodeURIComponent(match))).body.messages.length,0);
});
await t.test('saving unchanged or nonacademic fields preserves active status',async()=>{
await call('alice','profile',p('Alice'));
assert.equal((await call('alice','me')).body.profile.approved,1);
await call('alice','profile',{...p('Alice'),bio:'Nova descrição'});
assert.equal((await call('alice','me')).body.profile.approved,1);
});
await t.test('course and semester changes remain active; edits cannot bypass suspension',async()=>{
for(const change of [{course:'Psicologia'},{semester:7}]){
assert.equal((await call('alice','profile',{...p('Alice'),...change})).status,200);
assert.equal((await call('alice','me')).body.profile.approved,1);
assert.equal((await call('alice','discover')).status,200);
assert.equal((await call('bob','matches')).body.matches.length,1);
assert.equal((await call('bob','messages?match='+encodeURIComponent(match))).status,200);
}
await call('moderator','admin',{target:'alice',action:'suspend'});
assert.equal((await call('alice','discover')).status,403);
await call('alice','profile',p('Alice'));
assert.equal((await call('alice','me')).body.profile.approved,0);
assert.equal((await call('bob','matches')).body.matches.length,0);
assert.equal((await call('bob','messages?match='+encodeURIComponent(match))).status,404);
assert.equal((await call('moderator','admin')).body.suspended.some(x=>x.id==='alice'),true);
await call('moderator','admin',{target:'alice',action:'approve'});
assert.equal((await call('alice','discover')).status,200);
});
await t.test('block revokes chat, photos and discovery',async()=>{assert.equal((await call('alice','block',{target:'bob'})).status,200);assert.equal((await call('bob','messages?match='+encodeURIComponent(match))).status,404);assert.equal((await call('bob','matches')).body.matches.length,0);setUser('bob');assert.equal((await route.GET(new Request('https://test.invalid/api/photo/alice'))).status,404)});
await t.test('export contains only own sent messages and reactions',async()=>{const r=await call('alice','export');assert.equal(r.body.profile.id,'alice');assert.ok(r.body.reactions.every(x=>x.sender==='alice'))});
await t.test('account deletion cascades data and removes private photo',async()=>{assert.equal((await call('alice','delete',{confirm:'no'})).status,400);assert.equal((await call('alice','delete',{confirm:'EXCLUIR'})).status,200);assert.equal((await call('alice','me')).body.profile,null);assert.equal(files.size,0);assert.equal((await DB.prepare('SELECT * FROM reactions WHERE sender=? OR target=?').bind('alice','alice').all()).results.length,0)});
await t.test('recommendation ranks the entire eligible pool, normalizes legacy tags and explains shared interests',async()=>{
const owner='rec-owner';await call(owner,'profile',{...p('Recomendação'),interests:['Games','Anime','MÚSICA']});
assert.equal((await call(owner,'me')).body.profile.interests,JSON.stringify(['Jogos','Animes','Música']));
const fixtures=[
 ['rec-exact',['GAMES','anime','MUSICA','games'],1,0,'2000-01-01'],
 ['rec-broad',['Jogos','Animes','Música','Livros','Arte','Cinema'],1,0,'2026-01-01'],
 ['rec-one',['Música'],1,0,'2026-02-01'],
 ['rec-cinema',['Cinema'],1,0,'2000-01-01'],
 ['rec-paused',['Jogos','Animes','Música'],1,1,'2026-05-01'],
 ['rec-suspended',['Jogos','Animes','Música'],0,0,'2026-05-01'],
 ['rec-blocked',['Jogos','Animes','Música'],1,0,'2026-05-01'],
 ['rec-blocking',['Jogos','Animes','Música'],1,0,'2026-05-01'],
 ['rec-reacted',['Jogos','Animes','Música'],1,0,'2026-05-01'],
 ...Array.from({length:105},(_,i)=>['noise-'+String(i).padStart(3,'0'),['Café'],1,0,'2026-03-01'])];
const args=[];const placeholders=fixtures.map(([id,tags,active,paused,date])=>{args.push(id,'Teste','Engenharia de Software',1,22,'',JSON.stringify(tags),'Conhecer pessoas',date,date,active,paused);return '(?,?,?,?,?,?,?,?,?,?,?,?)'}).join(',');
await DB.prepare('INSERT INTO profiles(id,name,course,semester,age,bio,interests,intent,consent_at,created_at,approved,paused) VALUES '+placeholders).bind(...args).run();
await DB.batch([DB.prepare('INSERT INTO blocks VALUES (?,?)').bind(owner,'rec-blocked'),DB.prepare('INSERT INTO blocks VALUES (?,?)').bind('rec-blocking',owner),DB.prepare('INSERT INTO reactions VALUES (?,?,?)').bind(owner,'rec-reacted','pass')]);
const r=await call(owner,'discover');assert.equal(r.status,200);assert.equal(r.body.profiles.length,100);
assert.equal(r.body.profiles[0].id,'rec-exact');assert.equal(r.body.profiles[1].id,'rec-broad');
assert.deepEqual(r.body.profiles[0].commonInterests,['Jogos','Animes','Música']);
assert.ok(r.body.profiles.every(x=>!['rec-paused','rec-suspended','rec-blocked','rec-blocking','rec-reacted',owner].includes(x.id)));
});
await t.test('changing interests changes recommendations immediately, and empty interests fall back deterministically',async()=>{
await call('rec-owner','profile',{...p('Recomendação'),interests:['Filmes']});
assert.equal((await call('rec-owner','discover')).body.profiles[0].id,'rec-cinema');
await call('rec-owner','profile',{...p('Recomendação'),interests:[]});
const a=await call('rec-owner','discover'),b=await call('rec-owner','discover');
assert.equal(a.status,200);assert.deepEqual(a.body.profiles,b.body.profiles);
assert.ok(a.body.profiles.every(x=>x.commonInterests.length===0));
await DB.prepare("DELETE FROM profiles WHERE id LIKE 'rec-%' OR id LIKE 'noise-%'").run();
});
await t.test('durable rate limit applies',async()=>{let limited=false;for(let i=0;i<42;i++){const r=await call('mallory','pause',{paused:false});if(r.status===429)limited=true}assert.equal(limited,true)});
});
