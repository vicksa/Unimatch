export type PublicChatKey = {userId: string; keyId: string; encryptionPublicKey: string; signingPublicKey: string};
export type KeyBackup = {version: 1; iv: string; salt: string; ciphertext: string};
export type LocalChatKey = PublicChatKey & {encryptionPrivateKey: CryptoKey; signingPrivateKey: CryptoKey};
export type ChatEnvelope = {version: 1; context: string; id: string; senderKeyId: string; iv: string; ciphertext: string; recipients: {userId: string; keyId: string; wrappedKey: string}[]; signature: string};
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal: true});
export function base64(bytes: Uint8Array | ArrayBuffer): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let value = ''; for (const byte of array) value += String.fromCharCode(byte);
  return btoa(value);
}
export function unbase64(value: string): Uint8Array<ArrayBuffer> {
  const raw = atob(value); const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  if (base64(bytes) !== value) throw new Error('Formato criptográfico inválido.');
  return bytes;
}
const bytes = (value: string) => encoder.encode(value);
function ordered<T extends {userId: string; keyId: string}>(recipients: T[]): T[] {
  return [...recipients].sort((a, b) => a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0);
}
export function messageContext(matchId: string, sender: string, envelope: Pick<ChatEnvelope, 'id' | 'context' | 'senderKeyId' | 'recipients'>): string {
  return JSON.stringify(['unimatch.message', 1, matchId, envelope.context, envelope.id, sender, envelope.senderKeyId, ordered(envelope.recipients).map(r => [r.userId, r.keyId])]);
}
export function signedMessage(matchId: string, sender: string, envelope: ChatEnvelope): string {
  return JSON.stringify([messageContext(matchId, sender, envelope), envelope.iv, envelope.ciphertext, ordered(envelope.recipients).map(r => [r.userId, r.keyId, r.wrappedKey])]);
}
const backupContext = (userId: string, keyId: string) => bytes(JSON.stringify(['unimatch.backup', 1, userId, keyId]));
async function recoveryKey(code: string, salt: Uint8Array<ArrayBuffer>, userId: string, keyId: string) {
  const value = code.replace(/\s/g, '').replace(/^UM1-/, '');
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new Error('Código de recuperação inválido.');
  const secret = unbase64(value.replace(/-/g, '+').replace(/_/g, '/') + '=');
  if (secret.length !== 32) throw new Error('Código de recuperação inválido.');
  const material = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name: 'HKDF', hash: 'SHA-256', salt, info: backupContext(userId, keyId)}, material, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
}
export async function createChatKey(userId: string): Promise<{local: LocalChatKey; backup: KeyBackup; recoveryCode: string}> {
  const [encryption, signing] = await Promise.all([
    crypto.subtle.generateKey({name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256'}, true, ['encrypt', 'decrypt']),
    crypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']),
  ]);
  const [encryptionPublic, signingPublic, encryptionPrivate, signingPrivate] = await Promise.all([
    crypto.subtle.exportKey('spki', encryption.publicKey), crypto.subtle.exportKey('spki', signing.publicKey),
    crypto.subtle.exportKey('jwk', encryption.privateKey), crypto.subtle.exportKey('jwk', signing.privateKey),
  ]);
  const publicKey: PublicChatKey = {userId, keyId: crypto.randomUUID(), encryptionPublicKey: base64(encryptionPublic), signingPublicKey: base64(signingPublic)};
  const recoveryCode = 'UM1-' + base64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const iv = crypto.getRandomValues(new Uint8Array(12)), salt = crypto.getRandomValues(new Uint8Array(32));
  const key = await recoveryKey(recoveryCode, salt, userId, publicKey.keyId);
  const ciphertext = await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: backupContext(userId, publicKey.keyId)}, key, bytes(JSON.stringify({encryptionPrivate, signingPrivate})));
  const backup: KeyBackup = {version: 1, iv: base64(iv), salt: base64(salt), ciphertext: base64(ciphertext)};
  return {local: await restoreChatKey(publicKey, backup, recoveryCode), backup, recoveryCode};
}
export async function restoreChatKey(publicKey: PublicChatKey, backup: KeyBackup, recoveryCode: string): Promise<LocalChatKey> {
  try {
    const key = await recoveryKey(recoveryCode, unbase64(backup.salt), publicKey.userId, publicKey.keyId);
    const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv: unbase64(backup.iv), additionalData: backupContext(publicKey.userId, publicKey.keyId)}, key, unbase64(backup.ciphertext));
    const jwks = JSON.parse(decoder.decode(plaintext)) as {encryptionPrivate: JsonWebKey; signingPrivate: JsonWebKey};
    const rsaPublic = await crypto.subtle.importKey('jwk', {kty: 'RSA', n: jwks.encryptionPrivate.n, e: jwks.encryptionPrivate.e, key_ops: ['encrypt'], ext: true}, {name: 'RSA-OAEP', hash: 'SHA-256'}, true, ['encrypt']);
    const ecPublic = await crypto.subtle.importKey('jwk', {kty: 'EC', crv: 'P-256', x: jwks.signingPrivate.x, y: jwks.signingPrivate.y, key_ops: ['verify'], ext: true}, {name: 'ECDSA', namedCurve: 'P-256'}, true, ['verify']);
    if (base64(await crypto.subtle.exportKey('spki', rsaPublic)) !== publicKey.encryptionPublicKey || base64(await crypto.subtle.exportKey('spki', ecPublic)) !== publicKey.signingPublicKey) throw new Error('Key mismatch');
    const [encryptionPrivateKey, signingPrivateKey] = await Promise.all([
      crypto.subtle.importKey('jwk', jwks.encryptionPrivate, {name: 'RSA-OAEP', hash: 'SHA-256'}, false, ['decrypt']),
      crypto.subtle.importKey('jwk', jwks.signingPrivate, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign']),
    ]);
    return {...publicKey, encryptionPrivateKey, signingPrivateKey};
  } catch { throw new Error('Não foi possível desbloquear. Confira seu código de recuperação.'); }
}
export async function encryptChatMessage(local: LocalChatKey, recipients: PublicChatKey[], matchId: string, text: string, context: string, messageId = crypto.randomUUID()): Promise<ChatEnvelope> {
  const body = text.trim();
  if (!body || body.length > 2000) throw new Error('Escreva uma mensagem de até 2.000 caracteres.');
  if (recipients.length !== 2 || new Set(recipients.map(r => r.userId)).size !== 2 || !recipients.some(r => r.userId === local.userId && r.keyId === local.keyId && r.signingPublicKey === local.signingPublicKey && r.encryptionPublicKey === local.encryptionPublicKey)) throw new Error('Chaves da conversa indisponíveis.');
  const key = await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, true, ['encrypt', 'decrypt']);
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const wrapped = await Promise.all(ordered(recipients).map(async r => {
    const publicKey = await crypto.subtle.importKey('spki', unbase64(r.encryptionPublicKey), {name: 'RSA-OAEP', hash: 'SHA-256'}, false, ['encrypt']);
    return {userId: r.userId, keyId: r.keyId, wrappedKey: base64(await crypto.subtle.encrypt({name: 'RSA-OAEP'}, publicKey, rawKey))};
  }));
  const envelope: ChatEnvelope = {version: 1, context, id: messageId, senderKeyId: local.keyId, iv: base64(crypto.getRandomValues(new Uint8Array(12))), ciphertext: '', recipients: wrapped, signature: ''};
  envelope.ciphertext = base64(await crypto.subtle.encrypt({name: 'AES-GCM', iv: unbase64(envelope.iv), additionalData: bytes(messageContext(matchId, local.userId, envelope))}, key, bytes(body)));
  envelope.signature = base64(await crypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, local.signingPrivateKey, bytes(signedMessage(matchId, local.userId, envelope))));
  return envelope;
}
export async function decryptChatMessage(local: LocalChatKey, senderKey: PublicChatKey, matchId: string, sender: string, envelope: ChatEnvelope, context: string): Promise<string> {
  if (envelope.context !== context || envelope.version !== 1 || senderKey.userId !== sender || envelope.senderKeyId !== senderKey.keyId) throw new Error('Identidade da mensagem inválida.');
  const signingKey = await crypto.subtle.importKey('spki', unbase64(senderKey.signingPublicKey), {name: 'ECDSA', namedCurve: 'P-256'}, false, ['verify']);
  if (!await crypto.subtle.verify({name: 'ECDSA', hash: 'SHA-256'}, signingKey, unbase64(envelope.signature), bytes(signedMessage(matchId, sender, envelope)))) throw new Error('A assinatura da mensagem é inválida.');
  const recipient = envelope.recipients.find(r => r.userId === local.userId && r.keyId === local.keyId);
  if (!recipient) throw new Error('Esta mensagem usa outra chave de conversas.');
  const rawKey = await crypto.subtle.decrypt({name: 'RSA-OAEP'}, local.encryptionPrivateKey, unbase64(recipient.wrappedKey));
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv: unbase64(envelope.iv), additionalData: bytes(messageContext(matchId, sender, envelope))}, key, unbase64(envelope.ciphertext));
  const text = decoder.decode(plaintext);
  if (!text || text.length > 2000) throw new Error('Conteúdo da mensagem inválido.');
  return text;
}
export async function keyFingerprint(key: PublicChatKey): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes(JSON.stringify([key.userId, key.keyId, key.encryptionPublicKey, key.signingPublicKey])));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('').match(/.{1,8}/g)!.join(' ');
}
