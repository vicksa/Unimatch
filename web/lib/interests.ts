export const suggestedInterests=['Jogos','Animes','Música','Cinema','Séries','Livros','Esportes','Tecnologia','Arte','Viagens','Culinária','Fotografia','Café','Pets','Academia','Dança'] as const;

export const interestAliases:Record<string,string>={
  games:'jogos',game:'jogos',jogo:'jogos',gaming:'jogos',videogame:'jogos',videogames:'jogos',
  anime:'animes',music:'musica',musicas:'musica',
  filmes:'cinema',filme:'cinema',movies:'cinema',
  serie:'series',livro:'livros',books:'livros',
  esporte:'esportes',sports:'esportes',technology:'tecnologia',
};

function normalized(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');}
export function interestKey(value:string){const key=normalized(value);return interestAliases[key]||key;}

export function readInterests(value:unknown):string[]{
  if(typeof value==='string'){try{value=JSON.parse(value);}catch{return [];}}
  return Array.isArray(value)?value.filter((v):v is string=>typeof v==='string'&&!!v.trim()):[];
}
export function interestKeys(value:unknown){return [...new Set(readInterests(value).map(interestKey))];}
export function canonicalInterests(value:unknown){
  const labels=new Map(suggestedInterests.map(label=>[interestKey(label),label]));
  const seen=new Set<string>();
  return readInterests(value).flatMap(label=>{const key=interestKey(label);if(seen.has(key))return [];seen.add(key);return [labels.get(key)||label.trim().replace(/\s+/g,' ')];});
}
export function commonInterests(a:unknown,b:unknown){const theirs=new Set(interestKeys(b));return canonicalInterests(a).filter(label=>theirs.has(interestKey(label)));}

// Shared-count first, then Jaccard similarity. Empty profiles keep the original order.
export function rankByInterests<T extends {interests:unknown}>(own:unknown,profiles:T[]):T[]{
  const mine=new Set(interestKeys(own));
  return profiles.map((profile,index)=>{const keys=interestKeys(profile.interests);const common=keys.filter(k=>mine.has(k)).length;return {profile,index,common,similarity:common/(mine.size+keys.length-common||1)};})
    .sort((a,b)=>b.common-a.common||b.similarity-a.similarity||a.index-b.index).map(x=>x.profile);
}
