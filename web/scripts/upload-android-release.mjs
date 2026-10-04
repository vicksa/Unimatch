import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {put} from '@vercel/blob';
const file=new URL('../../android/app/build/outputs/apk/debug/app-debug.apk',import.meta.url);
const bytes=await readFile(file);
const sha256=createHash('sha256').update(bytes).digest('hex');
await put('downloads/UniMatch-0.3.apk',bytes,{access:'private',contentType:'application/vnd.android.package-archive',addRandomSuffix:false,allowOverwrite:false});
console.log(JSON.stringify({version:'0.3.0-pilot',versionCode:3,bytes:bytes.length,sha256,url:'https://unimatch-unilins.vercel.app/downloads/UniMatch-0.3.apk'},null,2));
