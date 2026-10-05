import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {profileSchema,participant,matchKey,validOrigin,validatePng,readBounded} from '../lib/domain.ts';
const p={name:'Vick',course:'Engenharia de Software',semester:6,age:22,bio:'Olá',interests:['Games'],intent:'Conhecer pessoas',consent:true};
test('valid profile accepted',()=>assert.equal(profileSchema.parse(p).name,'Vick'));
for(const [name,change] of Object.entries({minor:{age:17},semester:{semester:0},course:{course:'fake'},consent:{consent:false},overlong:{bio:'a'.repeat(401)},privilege:{approved:1},identity:{id:'another-user'},interests:{interests:Array(25).fill('a')}}))test('reject '+name,()=>assert.equal(profileSchema.safeParse({...p,...change}).success,false));
test('match stable in either direction',()=>assert.equal(matchKey('a','b'),matchKey('b','a')));
test('IDOR denied',()=>{assert.equal(participant({a:'a',b:'b'},'c'),false);assert.equal(participant(null,'a'),false);assert.equal(participant({a:'a',b:'b'},'a'),true)});
test('CSRF cross origin and missing origin denied',()=>{assert.equal(validOrigin(new Request('https://app.test/api',{headers:{Origin:'https://evil.test'}})),false);assert.equal(validOrigin(new Request('https://app.test/api')),false);assert.equal(validOrigin(new Request('https://app.test/api',{headers:{Origin:'https://app.test'}})),true)});
test('PNG real icon accepted, corruption and appended payload denied',async()=>{const b=new Uint8Array(await readFile('public/icon-192.png'));assert.equal(validatePng(b),true);const c=b.slice();c[50]^=1;assert.equal(validatePng(c),false);assert.equal(validatePng(new Uint8Array([...b,1])),false);assert.equal(validatePng(new TextEncoder().encode('<svg onload=alert(1)>')),false)});
test('streaming body bounded without content length',async()=>{await assert.rejects(readBounded(new Request('https://a.test',{method:'POST',body:'123456'}),5),RangeError);assert.equal((await readBounded(new Request('https://a.test',{method:'POST',body:'1234'}),5)).length,4)});

test('expanded interests accept 24 choices and long movie titles, but bound individual length',()=>{assert.equal(profileSchema.safeParse({...p,interests:Array.from({length:24},(_,i)=>'Hobby '+i)}).success,true);assert.equal(profileSchema.safeParse({...p,interests:['Filme: Três Homens, um Destino']}).success,true);assert.equal(profileSchema.safeParse({...p,interests:['a'.repeat(81)]}).success,false);});

test('preferences and prompts validate age range, enums, count, length and unique questions',()=>{
 assert.equal(profileSchema.parse(p).ageMin,18);
 assert.equal(profileSchema.safeParse({...p,ageMin:30,ageMax:20}).success,false);
 assert.equal(profileSchema.safeParse({...p,ageMin:17}).success,false);
 assert.equal(profileSchema.safeParse({...p,gender:'fake'}).success,false);
 const prompt={question:'Meu encontro ideal é…',answer:'Café e cinema'};
 assert.equal(profileSchema.safeParse({...p,prompts:[prompt]}).success,true);
 assert.equal(profileSchema.safeParse({...p,prompts:[prompt,prompt]}).success,false);
 assert.equal(profileSchema.safeParse({...p,prompts:[{...prompt,answer:'a'.repeat(201)}]}).success,false);
 assert.equal(profileSchema.safeParse({...p,prompts:Array(4).fill(prompt)}).success,false);
});

// Captured from WebKit 26 canvas.toBlob: IHDR, sBIT, sRGB, IDAT, IEND.
const safariPng = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAABHNCSVQICAgIfAhkiAAAAAFzUkdCAK7OHOkAAABHSURBVFiF7c4xAcAgEAAxin8b1fmVwHADHRIFeeZds35s3w6cCFaClWAlWAlWgpVgJVgJVoKVYCVYCVaClWAlWAlWgpVg9QFZtQLzFceb5gAAAABJRU5ErkJggg==', 'base64'));
function changeColorField(type:string, value:number) {
 const bytes=safariPng.slice(),view=new DataView(bytes.buffer);let pos=8;
 while(pos+12<=bytes.length){const len=view.getUint32(pos);if(String.fromCharCode(...bytes.slice(pos+4,pos+8))===type){bytes[pos+8]=value;let crc=0xffffffff;for(let i=pos+4;i<pos+8+len;i++){crc^=bytes[i];for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}view.setUint32(pos+8+len,(crc^0xffffffff)>>>0);return bytes}pos+=len+12}throw Error('Missing color field');
}
test('accept WebKit canvas PNG and reject corruption and invalid color fields', () => {
 assert.equal(validatePng(safariPng), true);
 const corrupted=safariPng.slice();corrupted[41]^=1;assert.equal(validatePng(corrupted), false);
 assert.equal(validatePng(changeColorField('sRGB',4)),false);
 assert.equal(validatePng(changeColorField('sBIT',0)),false);
 assert.equal(validatePng(changeColorField('sBIT',9)),false);
});
