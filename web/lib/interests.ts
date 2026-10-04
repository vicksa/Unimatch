export const MAX_INTERESTS=24;
export const MAX_INTEREST_LENGTH=80;
export const interestCategories=[
  {name:'Hobbies',options:['Livros','Culinária','Fotografia','Viagens','Arte','Desenho','Pintura','Artesanato','Jardinagem','Café','Dança','Caminhadas','Trilhas','Acampamento','Academia','Esportes','Futebol','Vôlei','Basquete','Natação','Ciclismo','Corrida','Skate','Yoga','Tecnologia']},
  {name:'Jogos e animes',options:['Jogos','Animes','Jogos de tabuleiro','RPG de mesa','Jogos cooperativos','Jogos de estratégia','Jogos de aventura','Valorant','League of Legends','Minecraft','The Sims','Pokémon','Naruto','One Piece','Dragon Ball','Studio Ghibli']},
  {name:'Estilos de música',options:['Música','Pop','Rock','MPB','Sertanejo','Pagode','Samba','Funk','Rap','Hip-hop','Eletrônica','Indie','Metal','Jazz','Blues','Reggae','Forró','Axé','K-pop','Gospel','Música clássica','Bossa nova']},
  {name:'Pets de que gosto',options:['Pets','Cachorros','Gatos','Coelhos','Hamsters','Aves','Peixes','Tartarugas','Cavalos']},
  {name:'Filmes e séries',options:['Cinema','Séries','Filmes de comédia','Filmes de romance','Filmes de ação','Filmes de aventura','Filmes de drama','Filmes de terror','Filmes de suspense','Ficção científica','Fantasia','Animação','Documentários']},
] as const;
export const suggestedInterests=interestCategories.flatMap(category=>[...category.options]);

export const interestAliases:Record<string,string>={
  games:'jogos',game:'jogos',jogo:'jogos',gaming:'jogos',videogame:'jogos',videogames:'jogos',
  anime:'animes',music:'musica',musicas:'musica',
  filmes:'cinema',filme:'cinema',movies:'cinema',
  serie:'series',livro:'livros',books:'livros',
  esporte:'esportes',sports:'esportes',technology:'tecnologia',
  cachorro:'cachorros',cao:'cachorros',caes:'cachorros',dog:'cachorros',dogs:'cachorros',
  gato:'gatos',cat:'gatos',cats:'gatos',coelho:'coelhos',hamster:'hamsters',
  ave:'aves',passaro:'aves',passaros:'aves',peixe:'peixes',tartaruga:'tartarugas',cavalo:'cavalos',
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
