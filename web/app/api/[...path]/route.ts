import {database} from '@/db/database';
import {photos} from '@/lib/photos';
import {canonicalInterests,interestKeys,commonInterests} from '@/lib/interests';
import {discoverySql} from '@/db/discovery';
import {getUser} from '@/app/auth';
import {profileSchema,matchKey,participant,validOrigin,validatePng,readBounded} from '@/lib/domain';
import {z} from 'zod';
import {keyRegistrationSchema,encryptedMessageSchema,verifyEnvelope,publicKeyRow,legacyUpgradeSchema} from '@/lib/chat-server';
import {preferencesFrom,mutuallyCompatible} from '@/lib/profile';
export const dynamic='force-dynamic';
function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
const runtime=()=>({DB:database(),BUCKET:photos,ADMIN_USER_ID:process.env.ADMIN_USER_ID});
export async function GET(req:Request){return handle(req)}
export async function POST(req:Request){return handle(req)}
async function handle(req:Request){
 try{
 const path=new URL(req.url).pathname.replace('/api/','');
 const user=await getUser(path==='me');if(!user)return json({error:'Entre na sua conta para continuar.'},401);
 const {DB:db,BUCKET:bucket,ADMIN_USER_ID:adminId}=runtime();if(!db)return json({error:'Serviço temporariamente indisponível.'},503);
 const id=user.userId;const admin=!!adminId&&id===adminId;
 const write=req.method==='POST';
 if(write&&!validOrigin(req))return json({error:'Origem não autorizada.'},403);
 if(write){const size=Number(req.headers.get('content-length')||0);if(size>3000000)return json({error:'Arquivo muito grande.'},413);const now=Date.now();const key=id+':'+Math.floor(now/60000);const rate=await db.prepare('INSERT INTO limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=limits.count+1 RETURNING count').bind(key,now+120000).first<{count:number}>();if((rate?.count||0)>40)return json({error:'Muitas tentativas. Aguarde um minuto.'},429);await db.prepare('DELETE FROM limits WHERE expires < ?').bind(now).run();}
 const mine=await db.prepare('SELECT profiles.*,ARRAY(SELECT slot FROM profile_photos WHERE profile_id=profiles.id ORDER BY slot) AS photos FROM profiles WHERE id=?').bind(id).first<Record<string,unknown>>();
 if(path==='me'&&!write)return json({profile:mine,admin,user:{name:user.fullName||'',id},adminConfigured:!!adminId});
 let body:Record<string,unknown>={};if(write&&path!=='photo'){const maxBody=path==='message-upgrade'?240000:24000;const raw=new TextDecoder().decode(await readBounded(req,maxBody));if(raw.length>maxBody)return json({error:'Dados muito grandes.'},413);body=JSON.parse(raw)}
 if(path==='profile'&&write){const p=profileSchema.parse(body);const now=new Date().toISOString();await db.prepare('INSERT INTO profiles(id,name,course,semester,age,bio,interests,intent,consent_at,created_at,approved,gender,looking_for,age_min,age_max,desired_intents,prompts) VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?::jsonb,?,?,?::jsonb,?::jsonb) ON CONFLICT(id) DO UPDATE SET name=excluded.name,course=excluded.course,semester=excluded.semester,age=excluded.age,bio=excluded.bio,interests=excluded.interests,intent=excluded.intent,gender=excluded.gender,looking_for=excluded.looking_for,age_min=excluded.age_min,age_max=excluded.age_max,desired_intents=excluded.desired_intents,prompts=excluded.prompts').bind(id,p.name,p.course,p.semester,p.age,p.bio,JSON.stringify(canonicalInterests(p.interests)),p.intent,now,now,p.gender,JSON.stringify([...new Set(p.lookingFor)]),p.ageMin,p.ageMax,JSON.stringify([...new Set(p.desiredIntents)]),JSON.stringify(p.prompts)).run();return json({ok:true});}
 if(!mine)return json({error:'Crie seu perfil primeiro.'},403);
 if(path==='pause'&&write){await db.prepare('UPDATE profiles SET paused=? WHERE id=?').bind(body.paused===true?1:0,id).run();return json({ok:true})}
 if(path==='export'&&!write){const [reactions,messages,reports,chatKey]=await Promise.all([db.prepare('SELECT * FROM reactions WHERE sender=?').bind(id).all(),db.prepare('SELECT * FROM messages WHERE sender=?').bind(id).all(),db.prepare('SELECT * FROM reports WHERE sender=?').bind(id).all(),db.prepare('SELECT * FROM chat_keys WHERE user_id=?').bind(id).first<Record<string,unknown>>()]);return json({profile:mine,reactions:reactions.results,messages:messages.results,reports:reports.results,chatKey:chatKey?{...publicKeyRow(chatKey),backup:chatKey.backup}:null})}
 if(path==='delete'&&write){if(body.confirm!=='EXCLUIR')return json({error:'Confirme a exclusão.'},400);const removed=await db.batch([db.prepare('SELECT id FROM profiles WHERE id=? FOR UPDATE').bind(id),db.prepare('SELECT key FROM profile_photos WHERE profile_id=?').bind(id),db.prepare('DELETE FROM audit WHERE actor=? OR target=?').bind(id,id),db.prepare('DELETE FROM profiles WHERE id=?').bind(id)]);if(bucket)await Promise.all(removed[1].map(photo=>bucket.delete(String(photo.key))));return json({ok:true});}

 if(path==='photo/remove'&&write){
  const slot=z.number().int().min(0).max(3).parse(body.slot);
  const removed=await db.batch([db.prepare('SELECT id FROM profiles WHERE id=? FOR UPDATE').bind(id),db.prepare('DELETE FROM profile_photos WHERE profile_id=? AND slot=? RETURNING key').bind(id,slot),...(slot===0?[db.prepare('UPDATE profiles SET photo=NULL WHERE id=?').bind(id)]:[])]);
  if(removed[1][0])await bucket.delete(String(removed[1][0].key));return json({ok:true});
 }
 if(path==='photo'&&write){
  if(!bucket)return json({error:'Fotos indisponíveis.'},503);
  const rawSlot=req.headers.get('X-Photo-Slot')||'0';if(!/^[0-3]$/.test(rawSlot))return json({error:'Escolha uma das quatro posições de foto.'},400);const slot=Number(rawSlot);
  if(req.headers.get('content-type')!=='image/png')return json({error:'Envie uma imagem PNG processada pelo app.'},400);
  const bytes=await readBounded(req,2000000);if(!validatePng(bytes))return json({error:'Imagem inválida. Use uma foto processada pelo app.'},400);
  const key=crypto.randomUUID()+'.png';await bucket.put(key,bytes);
  let previousKey:string|undefined;
  try{const saved=await db.batch([db.prepare('SELECT id FROM profiles WHERE id=? FOR UPDATE').bind(id),db.prepare('SELECT key FROM profile_photos WHERE profile_id=? AND slot=?').bind(id,slot),db.prepare('INSERT INTO profile_photos(profile_id,slot,key) VALUES (?,?,?) ON CONFLICT(profile_id,slot) DO UPDATE SET key=excluded.key').bind(id,slot,key),...(slot===0?[db.prepare('UPDATE profiles SET photo=? WHERE id=?').bind(key,id)]:[])]);previousKey=saved[1][0]?.key as string|undefined}catch(e){await bucket.delete(key);throw e}
  if(previousKey)await bucket.delete(previousKey);return json({ok:true});
 }
 if(path.startsWith('photo/')&&!write){
  const target=decodeURIComponent(path.slice(6));const rawSlot=new URL(req.url).searchParams.get('slot')||'0';if(!/^[0-3]$/.test(rawSlot))return json({error:'Foto indisponível.'},404);
  const p=await db.prepare('SELECT approved,paused FROM profiles WHERE id=?').bind(target).first<{approved:number;paused:number}>();
  const blocked=await db.prepare('SELECT 1 FROM blocks WHERE (sender=? AND target=?) OR (sender=? AND target=?)').bind(id,target,target,id).first();
  if(!p||(target!==id&&(!mine.approved||!p.approved||p.paused||blocked)))return json({error:'Foto indisponível.'},404);
  const image=await db.prepare('SELECT key FROM profile_photos WHERE profile_id=? AND slot=?').bind(target,Number(rawSlot)).first<{key:string}>();if(!image)return json({error:'Foto indisponível.'},404);
  const o=await bucket.get(image.key);return o?new Response(o.body,{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}}):json({error:'Foto indisponível.'},404);
 }
 if(path==='admin'&&!write){if(!admin)return json({error:'Acesso negado.'},403);const [suspended,reports]=await Promise.all([db.prepare('SELECT id,name,course,semester FROM profiles WHERE approved=0 LIMIT 100').all(),db.prepare('SELECT * FROM reports WHERE resolved=0 LIMIT 100').all()]);return json({suspended:suspended.results,reports:reports.results})}
 if(path==='admin'&&write){if(!admin)return json({error:'Acesso negado.'},403);const p=z.object({target:z.string().min(1).max(200),action:z.enum(['approve','suspend','resolve'])}).parse(body);await db.batch([p.action==='resolve'?db.prepare('UPDATE reports SET resolved=1 WHERE id=?').bind(p.target):db.prepare('UPDATE profiles SET approved=? WHERE id=?').bind(p.action==='approve'?1:0,p.target),db.prepare('INSERT INTO audit VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),id,p.action,p.target,new Date().toISOString())]);return json({ok:true})}
 if(!mine.approved)return json({error:'Seu perfil está suspenso pela moderação.'},403);
 if(path==='chat-key'){
  if(!write){const row=await db.prepare('SELECT * FROM chat_keys WHERE user_id=?').bind(id).first<Record<string,unknown>>();return json({chatKey:row?{...publicKeyRow(row),backup:row.backup}:null})}
  const key=keyRegistrationSchema.parse(body);
  const inserted=await db.prepare('INSERT INTO chat_keys(user_id,key_id,encryption_public_key,signing_public_key,backup,created_at) VALUES (?,?,?,?,?::jsonb,?) ON CONFLICT(user_id) DO NOTHING RETURNING key_id').bind(id,key.keyId,key.encryptionPublicKey,key.signingPublicKey,JSON.stringify(key.backup),new Date().toISOString()).first();
  if(!inserted)return json({error:'As conversas já foram ativadas. Use seu código de recuperação neste dispositivo.'},409);
  return json({ok:true});
 }
 if(path==='chat-keys'&&!write){
  const mid=new URL(req.url).searchParams.get('match');if(!mid)return json({error:'Conversa inválida.'},400);
  const match=await db.prepare('SELECT a,b,crypto_context FROM matches WHERE id=?').bind(mid).first<{a:string;b:string;crypto_context:string}>();if(!participant(match,id))return json({error:'Conversa indisponível.'},404);
  const peer=match!.a===id?match!.b:match!.a;const allowed=await db.prepare('SELECT 1 FROM profiles WHERE id=? AND approved=1').bind(peer).first();if(!allowed)return json({error:'Conversa indisponível.'},404);
  const keys=await db.prepare('SELECT user_id,key_id,encryption_public_key,signing_public_key FROM chat_keys WHERE user_id IN (?,?)').bind(id,peer).all();return json({keys:keys.results.map(publicKeyRow),context:match!.crypto_context});
 }
 if(path==='discover'&&!write){const rows=await db.prepare(discoverySql).bind(JSON.stringify(interestKeys(mine.interests)),id,id,id,id,id).all();return json({profiles:rows.results.map(p=>({...p,commonInterests:commonInterests(mine.interests,p.interests)}))})}
 if(path==='matches'&&!write){const rows=await db.prepare('SELECT m.id,p.id AS peer,p.name,p.course,p.semester,p.age,p.bio,p.interests,p.intent,p.photo,p.gender,p.prompts,ARRAY(SELECT slot FROM profile_photos WHERE profile_id=p.id ORDER BY slot) AS photos FROM matches m JOIN profiles p ON p.id=CASE WHEN m.a=? THEN m.b ELSE m.a END WHERE (m.a=? OR m.b=?) AND p.approved=1 AND NOT EXISTS(SELECT 1 FROM blocks WHERE (sender=? AND target=p.id) OR (target=? AND sender=p.id))').bind(id,id,id,id,id).all();return json({matches:rows.results})}
 const target=typeof body.target==='string'?body.target:'';
 if(['react','block','report'].includes(path)&&write){if(!target||target===id)return json({error:'Perfil inválido.'},400);const peer=await db.prepare('SELECT * FROM profiles WHERE id=? AND approved=1').bind(target).first<Record<string,unknown>>();if(!peer)return json({error:'Perfil indisponível.'},404);
 if(path==='block'){await db.batch([db.prepare('INSERT INTO blocks VALUES (?,?) ON CONFLICT DO NOTHING').bind(id,target),db.prepare('DELETE FROM matches WHERE (a=? AND b=?) OR (a=? AND b=?)').bind(id,target,target,id)]);return json({ok:true})}
 if(path==='report'){const reason=z.string().trim().min(5).max(500).parse(body.reason);await db.prepare('INSERT INTO reports (id,sender,target,reason,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),id,target,reason,new Date().toISOString()).run();return json({ok:true})}
 if(!mutuallyCompatible({...preferencesFrom(mine),age:Number(mine.age),intent:String(mine.intent)},{...preferencesFrom(peer),age:Number(peer.age),intent:String(peer.intent)}))return json({error:'Esse perfil não corresponde às preferências mútuas.'},404);
 const visible=await db.prepare('SELECT 1 FROM profiles WHERE id=? AND paused=0').bind(target).first();if(!visible)return json({error:'Perfil indisponível.'},404);if(mine.paused)return json({error:'Retome seu perfil para curtir.'},403);const blocked=await db.prepare('SELECT 1 FROM blocks WHERE (sender=? AND target=?) OR (sender=? AND target=?)').bind(id,target,target,id).first();if(blocked)return json({error:'Perfil indisponível.'},404);const kind=z.enum(['like','pass']).parse(body.kind);await db.prepare('INSERT INTO reactions VALUES (?,?,?) ON CONFLICT(sender,target) DO UPDATE SET kind=excluded.kind').bind(id,target,kind).run();const key=matchKey(id,target);await db.prepare("INSERT INTO matches (id,a,b,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM reactions WHERE sender=? AND target=? AND kind='like') AND EXISTS(SELECT 1 FROM reactions WHERE sender=? AND target=? AND kind='like') ON CONFLICT DO NOTHING").bind(key,...[id,target].sort(),new Date().toISOString(),id,target,target,id).run();const m=await db.prepare('SELECT id FROM matches WHERE id=?').bind(key).first();return json({match:!!m})}
 if(path==='messages'||(path==='message-upgrade'&&write)||(path==='message-legacy'&&!write)){const mid=write?body.match:new URL(req.url).searchParams.get('match');if(typeof mid!=='string')return json({error:'Conversa inválida.'},400);const m=await db.prepare('SELECT a,b,crypto_context FROM matches WHERE id=?').bind(mid).first<{a:string;b:string;crypto_context:string}>();if(!participant(m,id))return json({error:'Conversa indisponível.'},404);const peer=m!.a===id?m!.b:m!.a;const allowed=await db.prepare('SELECT 1 FROM profiles WHERE id=? AND approved=1').bind(peer).first();if(!allowed)return json({error:'Conversa indisponível.'},404);if(path==='message-legacy'){const legacy=await db.prepare('SELECT id,sender,body,created_at,encryption_version,envelope FROM messages WHERE match_id=? AND sender=? AND encryption_version=0 ORDER BY created_at ASC LIMIT 20').bind(mid,id).all();return json({messages:legacy.results})}if(path==='message-upgrade'){
 const payload=legacyUpgradeSchema.parse(body);const keyRows=await db.prepare('SELECT user_id,key_id,encryption_public_key,signing_public_key FROM chat_keys WHERE user_id IN (?,?)').bind(id,peer).all();const keys=keyRows.results.map(publicKeyRow);
 if(payload.envelopes.some(envelope=>envelope.context!==m!.crypto_context||!verifyEnvelope(mid,id,envelope,keys)))return json({error:'Não foi possível verificar a conversão do histórico.'},400);
 const results=await db.batch(payload.envelopes.map(envelope=>db.prepare("UPDATE messages SET body='',encryption_version=1,envelope=?::jsonb,legacy_migrated=1 WHERE id=? AND match_id=? AND sender=? AND encryption_version=0 RETURNING id").bind(JSON.stringify(envelope),envelope.id,mid,id)));
 return json({upgraded:results.flat().map(row=>row.id)});
 }if(write){
 const payload=encryptedMessageSchema.parse(body);const keys=await db.prepare('SELECT user_id,key_id,encryption_public_key,signing_public_key FROM chat_keys WHERE user_id IN (?,?)').bind(id,peer).all();
 if(payload.envelope.context!==m!.crypto_context||!verifyEnvelope(mid,id,payload.envelope,keys.results.map(publicKeyRow)))return json({error:'Chaves ou assinatura da mensagem inválidas. Ative as conversas nos dois dispositivos.'},400);
 const inserted=await db.prepare("INSERT INTO messages(id,match_id,sender,body,created_at,encryption_version,envelope) VALUES (?,?,?,'',?,1,?::jsonb) ON CONFLICT(id) DO NOTHING RETURNING id").bind(payload.envelope.id,mid,id,new Date().toISOString(),JSON.stringify(payload.envelope)).first();
 if(!inserted){const existing=await db.prepare('SELECT match_id,sender,envelope FROM messages WHERE id=?').bind(payload.envelope.id).first<Record<string,unknown>>();if(!existing||existing.match_id!==mid||existing.sender!==id||(existing.envelope as {signature?:string})?.signature!==payload.envelope.signature)return json({error:'Identificador de mensagem já utilizado.'},409)}
 return json({ok:true});
 }const rows=await db.prepare('SELECT id,sender,body,created_at,encryption_version,envelope,legacy_migrated FROM messages WHERE match_id=? ORDER BY created_at DESC LIMIT 100').bind(mid).all();return json({messages:rows.results.reverse()})}
 if(path==='unmatch'&&write){const mid=z.string().parse(body.match);const m=await db.prepare('SELECT a,b,crypto_context FROM matches WHERE id=?').bind(mid).first<{a:string;b:string;crypto_context:string}>();if(!participant(m,id))return json({error:'Conversa indisponível.'},404);await db.batch([db.prepare('DELETE FROM reactions WHERE (sender=? AND target=?) OR (sender=? AND target=?)').bind(m!.a,m!.b,m!.b,m!.a),db.prepare('DELETE FROM matches WHERE id=?').bind(mid)]);return json({ok:true})}
 return json({error:'Recurso não encontrado.'},404);
 }catch(e){if(e instanceof RangeError)return json({error:'Dados muito grandes.'},413);if(e instanceof z.ZodError||e instanceof SyntaxError)return json({error:'Confira os dados informados. Para conversar, atualize o app e ative a criptografia.'},400);console.error('API unavailable',e instanceof Error?e.name:'unknown');return json({error:'Não foi possível concluir. Tente novamente.'},503)}
}
