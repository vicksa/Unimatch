import {createPublicKey, verify} from 'node:crypto';
import {z} from 'zod';
import {signedMessage, type ChatEnvelope, type PublicChatKey} from './chat-crypto';

const encoded = (min: number, max: number) => z.string().min(min).max(max).regex(/^[A-Za-z0-9+/]+={0,2}$/).refine(s => Buffer.from(s, 'base64').toString('base64') === s);
const exactBytes = (length: number) => encoded(4, Math.ceil(length / 3) * 4).refine(s => Buffer.from(s, 'base64').length === length);
export const keyRegistrationSchema = z.object({
  keyId: z.string().uuid(),
  encryptionPublicKey: encoded(500, 800).refine(value => validPublicKey(value, 'rsa')),
  signingPublicKey: encoded(120, 200).refine(value => validPublicKey(value, 'ec')),
  backup: z.object({version: z.literal(1), iv: exactBytes(12), salt: exactBytes(32), ciphertext: encoded(64, 12000)}).strict(),
}).strict();
function validPublicKey(value: string, type: 'rsa' | 'ec'): boolean {
  try {
    const key = createPublicKey({key: Buffer.from(value, 'base64'), type: 'spki', format: 'der'});
    if (key.asymmetricKeyType !== type || key.export({type: 'spki', format: 'der'}).toString('base64') !== value) return false;
    return type === 'rsa' ? key.asymmetricKeyDetails?.modulusLength === 3072 && key.asymmetricKeyDetails.publicExponent === BigInt(65537) : key.asymmetricKeyDetails?.namedCurve === 'prime256v1';
  } catch { return false; }
}
export const encryptedMessageSchema = z.object({
  match: z.string().min(1).max(200),
  envelope: z.object({
    version: z.literal(1), context: z.string().uuid(), id: z.string().uuid(), senderKeyId: z.string().uuid(),
    iv: exactBytes(12), ciphertext: encoded(24, 10688).refine(s => Buffer.from(s, 'base64').length >= 17 && Buffer.from(s, 'base64').length <= 8016),
    recipients: z.array(z.object({userId: z.string().min(1).max(200), keyId: z.string().uuid(), wrappedKey: exactBytes(384)}).strict()).length(2),
    signature: exactBytes(64),
  }).strict(),
}).strict();
export function verifyEnvelope(matchId: string, sender: string, envelope: ChatEnvelope, keys: PublicChatKey[]): boolean {
  const own = keys.find(key => key.userId === sender);
  if (!own || own.keyId !== envelope.senderKeyId || keys.length !== 2 || new Set(envelope.recipients.map(r => r.userId)).size !== 2 || envelope.recipients.some(r => !keys.some(k => k.userId === r.userId && k.keyId === r.keyId))) return false;
  try {
    return verify('sha256', Buffer.from(signedMessage(matchId, sender, envelope)), {key: createPublicKey({key: Buffer.from(own.signingPublicKey, 'base64'), type: 'spki', format: 'der'}), dsaEncoding: 'ieee-p1363'}, Buffer.from(envelope.signature, 'base64'));
  } catch { return false; }
}
export function publicKeyRow(row: Record<string, unknown>): PublicChatKey {
  return {userId: String(row.user_id), keyId: String(row.key_id), encryptionPublicKey: String(row.encryption_public_key), signingPublicKey: String(row.signing_public_key)};
}

export const legacyUpgradeSchema=z.object({match:z.string().min(1).max(200),envelopes:z.array(encryptedMessageSchema.shape.envelope).min(1).max(20)}).strict().refine(p=>new Set(p.envelopes.map(e=>e.id)).size===p.envelopes.length);
