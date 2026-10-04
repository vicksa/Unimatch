'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import {LockKeyhole, MoreHorizontal, Send, Copy} from 'lucide-react';
import {toast} from 'sonner';
import {Checkbox} from '@/components/ui/checkbox';
import {createChatKey, restoreChatKey, encryptChatMessage, decryptChatMessage, keyFingerprint, type LocalChatKey, type PublicChatKey, type KeyBackup, type ChatEnvelope} from '@/lib/chat-crypto';
import {loadLocalChatKey, saveLocalChatKey, checkPeerIdentity, confirmPeerIdentity} from '@/lib/chat-key-store';

type StoredKey = PublicChatKey & {backup: KeyBackup};
type Message = {id: string; sender: string; body: string; encryption_version: number; legacy_migrated?: number; envelope?: ChatEnvelope; failed?: boolean};
type Setup = Awaited<ReturnType<typeof createChatKey>>;
async function chatApi<T>(path: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/api/' + path, {method: data ? 'POST' : 'GET', cache: 'no-store', signal, headers: data ? {'Content-Type': 'application/json'} : {}, body: data ? JSON.stringify(data) : undefined});
  const result = await response.json();
  if (!response.ok) throw new Error((result as {error?:string}).error || 'Não foi possível atualizar a conversa.');
  return result as T;
}
export default function EncryptedChat({match, userId, onOptions}: {match: {id: string; peer: string; course: string}; userId: string; onOptions: () => void}) {
  const [stored, setStored] = useState<StoredKey | null>(null), [local, setLocal] = useState<LocalChatKey | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null), [confirmed, setConfirmed] = useState(false), [code, setCode] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [context,setContext]=useState('');
  const [keys, setKeys] = useState<PublicChatKey[]>([]), [messages, setMessages] = useState<Message[]>([]), [text, setText] = useState('');
  const [changedPeer,setChangedPeer]=useState<PublicChatKey|null>(null);
  const [fingerprints, setFingerprints] = useState<{mine: string; peer: string} | null>(null);
  const decryptCache = useRef(new Map<string, Message>());
  const contextRef=useRef('');
  const sendLock = useRef(false);
  const pendingSends = useRef(new Map<string, Message>());
  const retryEnvelope = useRef<{body: string; envelope: ChatEnvelope} | null>(null);
  const peerKey = keys.find(k => k.userId === match.peer);
  const ready = !!local && !!peerKey && !!context && !loading && !error;

  useEffect(() => {
    const life = new AbortController();
    async function load() {
      try {
        const result = await chatApi<{chatKey: StoredKey | null}>('chat-key', undefined, life.signal);
        const cached = await loadLocalChatKey(userId).catch(() => null);
        if (life.signal.aborted) return;
        setStored(result.chatKey);
        if (cached && result.chatKey && cached.keyId === result.chatKey.keyId && cached.encryptionPublicKey === result.chatKey.encryptionPublicKey && cached.signingPublicKey === result.chatKey.signingPublicKey) setLocal(cached);
      } catch (e) {if (!life.signal.aborted) setError((e as Error).message);}
      finally {if (!life.signal.aborted) setLoading(false);}
    }
    void load(); return () => life.abort();
  }, [userId]);

  useEffect(() => {
    if (!local) return;
    const life = new AbortController(); const cache=decryptCache.current; let inFlight = false;let legacyDone=false;
    async function sync() {
      if (document.hidden || inFlight || life.signal.aborted) return;
      inFlight = true;
      try {
        const [directory, history] = await Promise.all([
          chatApi<{keys: PublicChatKey[];context:string}>('chat-keys?match=' + encodeURIComponent(match.id), undefined, life.signal),
          chatApi<{messages: Message[]}>('messages?match=' + encodeURIComponent(match.id), undefined, life.signal),
        ]);
        const own = directory.keys.find(k => k.userId === userId), peer = directory.keys.find(k => k.userId === match.peer);
        if (!own || own.keyId !== local!.keyId || own.encryptionPublicKey !== local!.encryptionPublicKey || own.signingPublicKey !== local!.signingPublicKey) throw new Error('A chave da sua conta mudou. Desbloqueie novamente antes de conversar.');
        if(peer){try{await checkPeerIdentity(userId,peer)}catch(e){if(!life.signal.aborted){setChangedPeer(peer);setKeys([]);setFingerprints({mine:await keyFingerprint(own),peer:await keyFingerprint(peer)})}throw e}}
        if(contextRef.current&&contextRef.current!==directory.context){cache.clear();pendingSends.current.clear();retryEnvelope.current=null;legacyDone=false}
        contextRef.current=directory.context;
        if(peer&&!legacyDone){
          const legacy=(await chatApi<{messages:Message[]}>('message-legacy?match='+encodeURIComponent(match.id),undefined,life.signal)).messages;
          if(legacy.length===0)legacyDone=true;
          if(legacy.length){
            const envelopes=await Promise.all(legacy.map(message=>encryptChatMessage(local!,directory.keys,match.id,message.body,directory.context,message.id)));
            if(life.signal.aborted)return;
            const result=await chatApi<{upgraded:string[]}>('message-upgrade',{match:match.id,envelopes},life.signal);
            for(const message of history.messages){const envelope=envelopes.find(e=>e.id===message.id);if(envelope&&result.upgraded.includes(message.id)){message.encryption_version=1;message.legacy_migrated=1;message.envelope=envelope;message.body=''}}
          }
        }
        const decoded = await Promise.all(history.messages.map(async message => {
          if (message.encryption_version === 0) return message;
          const cacheId = JSON.stringify([message.id,message.sender,message.envelope]);
          const cached = cache.get(cacheId); if (cached) return cached;
          const senderKey = directory.keys.find(k => k.userId === message.sender);
          try {
            if (!senderKey || !message.envelope || message.envelope.id !== message.id) throw new Error('Missing key');
            const body = await decryptChatMessage(local!, senderKey, match.id, message.sender, message.envelope,directory.context);
            const decoded = {...message, body}; cache.set(cacheId, decoded); return decoded;
          } catch {return {...message, body: 'Não foi possível verificar ou abrir esta mensagem.', failed: true};}
        }));
        if(cache.size>300)cache.clear();
        const codes = peer ? {mine: await keyFingerprint(own), peer: await keyFingerprint(peer)} : null;
        if (life.signal.aborted) return;
        for(const message of decoded)pendingSends.current.delete(message.id);
        setContext(directory.context);setChangedPeer(null);setKeys(directory.keys); setMessages([...decoded,...pendingSends.current.values()]); setFingerprints(codes); setError('');
      } catch (e) {if (!life.signal.aborted) setError((e as Error).message);}
      finally {inFlight = false;}
    }
    const resume = () => {void sync();}; void sync(); const timer = setInterval(sync, 8000);
    document.addEventListener('visibilitychange', resume); window.addEventListener('focus', resume); window.addEventListener('online', resume);
    return () => {life.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', resume); window.removeEventListener('focus', resume); window.removeEventListener('online', resume); cache.clear();};
  }, [local, match.id, match.peer, userId]);

  async function generate() {
    if (busy) return; setBusy(true); setError('');
    try {setSetup(await createChatKey(userId));} catch {setError('Não foi possível gerar as chaves neste dispositivo. Tente novamente.');} finally {setBusy(false);}
  }
  async function activate() {
    if (!setup || !confirmed || busy) return; setBusy(true); setError('');
    try {
      await chatApi('chat-key', {keyId: setup.local.keyId, encryptionPublicKey: setup.local.encryptionPublicKey, signingPublicKey: setup.local.signingPublicKey, backup: setup.backup});
      setStored({...setup.local,backup:setup.backup}); setLocal(setup.local);
      try{await saveLocalChatKey(setup.local)}catch{toast('Conversas ativadas nesta sessão. Use o código ao reabrir neste dispositivo.')}
      setSetup(null); setConfirmed(false);
    } catch (e) {setError((e as Error).message);try{const result=await chatApi<{chatKey:StoredKey|null}>('chat-key');if(result.chatKey){setStored(result.chatKey);setSetup(null)}}catch{}} finally {setBusy(false);}
  }
  async function unlock(event: FormEvent) {
    event.preventDefault(); if (!stored || busy) return; setBusy(true); setError('');
    try {const key = await restoreChatKey(stored, stored.backup, code); setLocal(key);try{await saveLocalChatKey(key)}catch{toast('Chave aberta nesta sessão. Use o código ao reabrir neste dispositivo.')}setCode('');} catch (e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  async function send(event: FormEvent) {
    event.preventDefault(); if (!ready || !local || !text.trim() || sendLock.current) return;
    sendLock.current = true; setBusy(true);
    try {
      const body = text.trim(), envelope = retryEnvelope.current?.body===body&&retryEnvelope.current.envelope.context===context?retryEnvelope.current.envelope:await encryptChatMessage(local, keys, match.id, body,context);
      retryEnvelope.current={body,envelope};
      await chatApi('messages', {match: match.id, envelope});
      const message: Message = {id: envelope.id, sender: userId, body, envelope, encryption_version: 1};
      pendingSends.current.set(message.id,message);retryEnvelope.current=null;
      decryptCache.current.set(JSON.stringify([message.id,message.sender,message.envelope]), message);
      setMessages(current => current.some(m => m.id === message.id) ? current : [...current, message]); setText('');
    } catch (e) {toast.error((e as Error).message);} finally {sendLock.current = false; setBusy(false);}
  }
  return <section className="chat-panel">
    <div className="chat-head"><span>{match.course}</span><button className="icon-btn" aria-label="Opções da conversa" onClick={onOptions}><MoreHorizontal/></button></div>
    {error ? <p className="chat-error" role="alert">{error}</p> : null}
    {loading ? <p className="chat-notice">Preparando conversa…</p> : !local ? <div className="chat-key-gate">
      <LockKeyhole aria-hidden="true"/><h2>{stored ? 'Desbloquear conversas' : 'Ativar conversas privadas'}</h2>
      {stored ? <form onSubmit={unlock}><p>Use seu código de recuperação para abrir as conversas neste dispositivo.</p><label>Código de recuperação<input aria-label="Código de recuperação" type="password" autoComplete="off" value={code} onChange={e => setCode(e.target.value)} required/></label><button className="primary" disabled={busy || !code.trim()}>{busy ? 'Desbloqueando…' : 'Desbloquear'}</button></form> : setup ? <>
        <p>Guarde este código em um lugar seguro. Ele permite abrir seu histórico em outro celular. Não envie o código a outras pessoas.</p>
        <label>Seu código de recuperação<textarea aria-label="Seu código de recuperação" readOnly rows={3} value={setup.recoveryCode}/></label>
        <button className="secondary" onClick={async () => {try {await navigator.clipboard.writeText(setup.recoveryCode); toast.success('Código copiado. Guarde-o em um lugar seguro.');} catch {toast.error('Selecione e copie o código acima.');}}}><Copy size={16}/>Copiar código</button>
        <div className="consent"><Checkbox id={'recovery-' + match.id} checked={confirmed} onCheckedChange={v => setConfirmed(v === true)}/><label htmlFor={'recovery-' + match.id}>Guardei meu código. Se eu perder o código e o acesso a este dispositivo, o UniMatch não poderá recuperar minhas conversas.</label></div>
        <button className="primary" disabled={busy || !confirmed} onClick={() => void activate()}>{busy ? 'Ativando…' : 'Ativar conversas'}</button>
      </> : <><p>As novas mensagens serão criptografadas de ponta a ponta. Vamos gerar um código para você recuperar suas chaves em outro dispositivo.</p><button className="primary" disabled={busy} onClick={() => void generate()}>{busy ? 'Gerando chaves…' : 'Gerar código de recuperação'}</button></>}
    </div> : <>
      <p className="chat-notice encryption-status"><LockKeyhole size={15}/>{peerKey ? 'Novas mensagens protegidas de ponta a ponta.' : 'Aguardando a outra pessoa ativar as conversas privadas.'}</p>
      {fingerprints ? <details className="chat-security" open={changedPeer?true:undefined}><summary>Códigos de segurança</summary><p>Compare estes códigos com a outra pessoa por outro meio para confirmar as identidades.</p><span>Seu código de segurança</span><code>{fingerprints.mine}</code><span>Código da outra pessoa</span><code>{fingerprints.peer}</code>{changedPeer?<button className="secondary" onClick={async()=>{try{await confirmPeerIdentity(userId,changedPeer);setChangedPeer(null);setError('');window.dispatchEvent(new Event('focus'))}catch{toast.error('Não foi possível confirmar a identidade.')}}}>Confirmei os códigos com esta pessoa</button>:null}</details> : null}
      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 ? <div className="chat-intro"><p>Vocês deram match.</p><span>{peerKey ? 'Comece uma conversa.' : 'As duas pessoas precisam ativar a criptografia para enviar mensagens.'}</span></div> : null}
        {messages.map(message => <div key={message.id} className={'bubble ' + (message.sender === userId ? 'sent' : 'received')}><p>{message.body}</p>{message.encryption_version === 0 ? <span className="message-security-note">Mensagem antiga, anterior à criptografia de ponta a ponta.</span> : message.legacy_migrated ? <span className="message-security-note">Mensagem antiga, cifrada após o envio original.</span> : message.failed ? <span className="message-security-note">Conteúdo não verificado.</span> : null}</div>)}
      </div>
      <form className="composer" onSubmit={send}><input aria-label="Mensagem" placeholder={ready ? 'Escreva uma mensagem…' : 'Criptografia aguardando ativação'} value={text} maxLength={2000} disabled={!ready} onChange={e => setText(e.target.value)}/><button className="primary icon-btn" aria-label="Enviar mensagem" disabled={!ready || !text.trim() || busy}><Send size={20}/></button></form>
    </>}
  </section>;
}
