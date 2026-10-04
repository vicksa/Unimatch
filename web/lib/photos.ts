import {put,get,del} from '@vercel/blob';

export const photos={
  async put(key:string,bytes:Uint8Array){
    await put(key,Buffer.from(bytes),{access:'private',contentType:'image/png',addRandomSuffix:false});
  },
  async get(key:string){
    const result=await get(key,{access:'private',useCache:false});
    return result?.statusCode===200?{body:result.stream}:null;
  },
  async delete(key:string){await del(key);},
};
