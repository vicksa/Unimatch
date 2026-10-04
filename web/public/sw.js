// Never cache profiles, private images, messages, authentication or HTML.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width, initial-scale=1"><title>UniMatch</title><body style="font-family:Arial;padding:32px"><h1>Você está offline.</h1><p>Conecte-se à internet para abrir o UniMatch. Seus dados privados não são guardados no cache offline.</p><button onclick="location.reload()">Tentar novamente</button></body></html>',{headers:{'Content-Type':'text/html;charset=utf-8'}})))});
