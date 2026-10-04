import {get} from '@vercel/blob';

export const runtime='nodejs';

// Only this fixed application release is public. Profile photos stay authenticated.
export async function GET(){
  const release=await get('downloads/UniMatch-0.3.apk',{access:'private'});
  if(!release || release.statusCode!==200)return new Response('APK indisponível',{status:503,headers:{'Cache-Control':'no-store'}});
  return new Response(release.stream,{headers:{
    'Content-Type':'application/vnd.android.package-archive',
    'Content-Disposition':'attachment; filename="UniMatch-0.3.apk"',
    'Content-Length':String(release.blob.size),
    'X-Content-Type-Options':'nosniff',
    'Cache-Control':'public, max-age=3600',
  }});
}
