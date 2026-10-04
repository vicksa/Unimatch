import {createRequire} from 'node:module';const require=createRequire(import.meta.resolve('wrangler'));const {build}=require('esbuild');import path from 'node:path';import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const root=process.cwd();await build({entryPoints:['app/api/[...path]/route.ts'],outfile:'.sites-runtime/test-api.mjs',bundle:true,format:'esm',platform:'node',packages:'external',plugins:[{name:'test-injections',setup(b){b.onResolve({filter:/^(@\/app\/auth|@\/lib\/photos|@\/db\/database)$/},()=>({path:path.join(root,'tests/runtime.mjs'),external:true}));b.onResolve({filter:/^@\//},a=>({path:path.join(root,a.path.replace('@/',''))+'.ts'}))}}]});
const route=await import('../.sites-runtime/test-api.mjs');const {setUser,DB,files,env}=await import('./runtime.mjs');
async function call(user,path,data,origin='https://test.invalid'){setUser(user);const req=new Request('https://test.invalid/api/'+path,{method:data===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const r=await(data===undefined?route.GET(req):route.POST(req));return {status:r.status,body:await r.json()}}
assert.equal((await DB.prepare('SELECT current_schema() AS schema').first()).schema,process.env.TEST_DATABASE_SCHEMA,'Refuse to run API tests outside the isolated schema');
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
await t.test('four private photo positions, concurrent replacement, removal and slot validation',async()=>{
 const png=await readFile('public/icon-192.png');
 const upload=slot=>route.POST(new Request('https://test.invalid/api/photo',{method:'POST',headers:{Origin:'https://test.invalid','Content-Type':'image/png','X-Photo-Slot':String(slot)},body:png}));
 setUser('alice');for(const slot of [1,2,3])assert.equal((await upload(slot)).status,200);
 assert.equal(files.size,4);
 assert.equal((await upload(4)).status,400);
 const replacements=await Promise.all([upload(1),upload(1)]);assert.ok(replacements.every(r=>r.status===200));assert.equal(files.size,4);
 assert.deepEqual((await call('alice','me')).body.profile.photos,[0,1,2,3]);
 setUser('bob');assert.equal((await route.GET(new Request('https://test.invalid/api/photo/alice?slot=3'))).status,200);
 assert.equal((await call('bob','photo/remove',{slot:3,target:'alice'})).status,200);
 assert.deepEqual((await call('alice','me')).body.profile.photos,[0,1,2,3]);
 assert.equal((await call('alice','photo/remove',{slot:2})).status,200);assert.equal(files.size,3);
 setUser('alice');assert.equal((await route.GET(new Request('https://test.invalid/api/photo/alice?slot=2'))).status,404);
});
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
await t.test('block revokes chat, photos and discovery',async()=>{assert.equal((await call('alice','block',{target:'bob'})).status,200);assert.equal((await call('bob','messages?match='+encodeURIComponent(match))).status,404);assert.equal((await call('bob','matches')).body.matches.length,0);setUser('bob');assert.equal((await route.GET(new Request('https://test.invalid/api/photo/alice'))).status,404);assert.equal((await route.GET(new Request('https://test.invalid/api/photo/alice?slot=3'))).status,404)});
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
await t.test('mutual preferences filter discovery before ranking and reject direct incompatible likes',async()=>{
 const owner={...p('Preferências'),gender:'Mulher',age:22,intent:'Relacionamento',lookingFor:['Homem'],ageMin:21,ageMax:25,desiredIntents:['Relacionamento'],prompts:[{question:'Meu encontro ideal é…',answer:'Cinema e café'}]};
 assert.equal((await call('pref-owner','profile',owner)).status,200);
 const peer={...p('Compatível'),gender:'Homem',age:24,intent:'Relacionamento',lookingFor:['Mulher'],ageMin:22,ageMax:30};
 const fixtures=[['pref-good',{}],['pref-reverse-age',{ageMin:23}],['pref-reverse-gender',{lookingFor:['Homem']}],['pref-reverse-intent',{desiredIntents:['Amizade']}],['pref-age',{age:26}],['pref-gender',{gender:'Mulher'}],['pref-intent',{intent:'Amizade'}]];
 for(const [id,change]of fixtures)assert.equal((await call(id,'profile',{...peer,...change})).status,200);
 const discover=(await call('pref-owner','discover')).body.profiles;
 const debug=(await DB.prepare("SELECT id,age,gender,looking_for,age_min,age_max,intent,desired_intents,approved,paused FROM profiles WHERE id LIKE 'pref-%' ORDER BY id").all()).results;
 assert.deepEqual(discover.map(p=>p.id),['pref-good'],JSON.stringify(debug));
 assert.equal('looking_for'in discover[0],false);assert.equal('desired_intents'in discover[0],false);
 assert.equal((await call('pref-reverse-age','discover')).body.profiles.some(p=>p.id==='pref-owner'),false);
 assert.equal((await call('pref-owner','react',{target:'pref-reverse-age',kind:'like'})).status,404);
 assert.equal((await call('pref-owner','react',{target:'pref-good',kind:'like'})).status,200);
 assert.equal((await call('pref-good','react',{target:'pref-owner',kind:'like'})).body.match,true);
 const matched=(await call('pref-good','matches')).body.matches.find(m=>m.peer==='pref-owner');assert.deepEqual(matched.prompts,owner.prompts);
 assert.equal((await call('pref-owner','profile',{...owner,ageMin:26,ageMax:30})).status,200);
 assert.ok((await call('pref-owner','discover')).body.profiles.some(p=>p.id==='pref-age'));
 assert.equal((await call('pref-owner','messages',{match:matched.id,body:'Preferências novas preservam conversas existentes'})).status,200);
});
await t.test('durable rate limit rejects writes and increments the persisted counter',async()=>{
 const now=Date.now();const minute=Math.floor(now/60000);
 // Cover both sides of a minute boundary without timing-dependent bursts.
 for(const bucket of [minute,minute+1])await DB.prepare('INSERT INTO limits(key,count,expires) VALUES (?,40,?) ON CONFLICT(key) DO UPDATE SET count=40,expires=excluded.expires').bind('mallory:'+bucket,now+120000).run();
 assert.equal((await call('mallory','pause',{paused:true})).status,429);
 assert.equal((await call('mallory','me')).body.profile.paused,0);
 const counters=(await DB.prepare('SELECT count FROM limits WHERE key IN (?,?)').bind('mallory:'+minute,'mallory:'+(minute+1)).all()).results;
 assert.ok(counters.some(row=>row.count===41));
});
});
