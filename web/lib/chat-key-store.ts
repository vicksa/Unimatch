import {keyFingerprint, type LocalChatKey, type PublicChatKey} from './chat-crypto';
function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('unimatch-chat-v1', 1);
    request.onupgradeneeded = () => {request.result.createObjectStore('keys'); request.result.createObjectStore('peers');};
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Não foi possível acessar as chaves neste dispositivo.'));
  });
}
async function operation<T>(store: 'keys' | 'peers', mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openStore();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode), request = run(tx.objectStore(store));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(new Error('Não foi possível salvar a chave neste dispositivo.'));
      tx.onabort = () => reject(new Error('Operação de chave cancelada.'));
    });
  } finally {db.close();}
}
export const loadLocalChatKey = (userId: string) => operation<LocalChatKey | undefined>('keys', 'readonly', store => store.get(userId));
export const saveLocalChatKey = (key: LocalChatKey) => operation('keys', 'readwrite', store => store.put(key, key.userId));
export const clearLocalChatKey = (userId: string) => operation('keys', 'readwrite', store => store.delete(userId));
export async function checkPeerIdentity(userId: string, peer: PublicChatKey): Promise<void> {
  const id = userId + ':' + peer.userId, fingerprint = await keyFingerprint(peer);
  const previous = await operation<string | undefined>('peers', 'readonly', store => store.get(id));
  if (previous && previous !== fingerprint) throw new Error('O código de segurança dessa pessoa mudou. Não enviamos mensagens com a nova chave.');
  if (!previous) await operation('peers', 'readwrite', store => store.put(fingerprint, id));
}
export async function confirmPeerIdentity(userId: string, peer: PublicChatKey): Promise<void> {
  const fingerprint=await keyFingerprint(peer);
  await operation('peers', 'readwrite', store => store.put(fingerprint, userId + ':' + peer.userId));
}
