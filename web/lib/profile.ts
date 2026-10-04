export const genders=['Mulher','Homem','Não binário','Outro','Prefiro não informar'] as const;
export const intentions=['Conhecer pessoas','Relacionamento','Amizade'] as const;
export const promptQuestions=['Meu encontro ideal é…','Um assunto que eu não paro de falar…','Depois da aula, você me encontra…','Uma coisa que quero fazer este ano…','Meu talento mais aleatório…','A gente vai se dar bem se…'] as const;
export type ProfilePrompt={question:typeof promptQuestions[number];answer:string};
export type Preferences={gender:string;lookingFor:string[];ageMin:number;ageMax:number;desiredIntents:string[]};
export const defaultPreferences:Preferences={gender:'Prefiro não informar',lookingFor:[],ageMin:18,ageMax:100,desiredIntents:[]};
export function readList<T>(value:unknown):T[]{if(typeof value==='string'){try{value=JSON.parse(value)}catch{return []}}return Array.isArray(value)?value as T[]:[]}
export function preferencesFrom(value:Record<string,unknown>):Preferences{return {gender:String(value.gender||defaultPreferences.gender),lookingFor:readList<string>(value.looking_for??value.lookingFor),ageMin:Number(value.age_min??value.ageMin??18),ageMax:Number(value.age_max??value.ageMax??100),desiredIntents:readList<string>(value.desired_intents??value.desiredIntents)}}
export function mutuallyCompatible(a:Preferences&{age:number;intent:string},b:Preferences&{age:number;intent:string}){
 const accepts=(owner:typeof a,peer:typeof b)=>peer.age>=owner.ageMin&&peer.age<=owner.ageMax&&(!owner.lookingFor.length||owner.lookingFor.includes(peer.gender))&&(!owner.desiredIntents.length||owner.desiredIntents.includes(peer.intent));
 return accepts(a,b)&&accepts(b,a);
}
