import {z} from 'zod';
export const courses=['Administração','Arquitetura e Urbanismo','Biomedicina','Educação Física','Enfermagem','Engenharia Civil','Engenharia de Computação','Engenharia de Software','Engenharia Elétrica','Engenharia Mecânica','Farmácia','Fisioterapia','Fonoaudiologia','Odontologia','Psicologia','Serviço Social','Outro curso'];
export const profileSchema=z.object({name:z.string().trim().min(2).max(40),course:z.enum(courses as [string,...string[]]),semester:z.number().int().min(1).max(12),age:z.number().int().min(18).max(100),bio:z.string().trim().max(400),interests:z.array(z.string().trim().min(1).max(25)).max(8),intent:z.enum(['Conhecer pessoas','Relacionamento','Amizade']),consent:z.literal(true)}).strict();
export function matchKey(a:string,b:string){return [a,b].sort().join(':');}
export function participant(m:{a:string;b:string}|null,id:string){return !!m&&(m.a===id||m.b===id);}
export function validOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
export function validatePng(bytes:Uint8Array){
 if(bytes.length<45||bytes.length>2000000||![137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))return false;
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let pos=8,first=true,data=false,ended=false;
 while(pos+12<=bytes.length){const len=view.getUint32(pos);if(pos+12+len>bytes.length)return false;const type=String.fromCharCode(...bytes.slice(pos+4,pos+8));if(first&&(type!=='IHDR'||len!==13))return false;
 if(!['IHDR','IDAT','IEND','PLTE','tRNS'].includes(type))return false;
 if(type==='IHDR'){if(!first||view.getUint32(pos+8)<1||view.getUint32(pos+12)<1||view.getUint32(pos+8)>1600||view.getUint32(pos+12)>1600)return false;}
 let crc=0xffffffff;for(let i=pos+4;i<pos+8+len;i++){crc^=bytes[i];for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}if(((crc^0xffffffff)>>>0)!==view.getUint32(pos+8+len))return false;
 first=false;if(type==='IDAT')data=true;pos+=12+len;if(type==='IEND'){if(len!==0)return false;ended=true;break;}}
 return data&&ended&&pos===bytes.length;
}
export async function readBounded(req:Request,max:number){const reader=req.body?.getReader();if(!reader)return new Uint8Array();const chunks:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new RangeError('Payload too large')}chunks.push(value)}const result=new Uint8Array(size);let pos=0;for(const c of chunks){result.set(c,pos);pos+=c.length}return result;}
