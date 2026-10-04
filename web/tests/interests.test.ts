import test from 'node:test';
import assert from 'node:assert/strict';
import {interestKey,canonicalInterests,commonInterests,rankByInterests,readInterests} from '../lib/interests.ts';

test('normalize case, accents, spacing and equivalent labels',()=>{
  assert.equal(interestKey('  MÚSICA  '),'musica');
  assert.equal(interestKey('Games'),'jogos');
  assert.equal(interestKey('anime'),'animes');
  assert.equal(interestKey('League   of Legends'),'league of legends');
});
test('duplicates and aliases do not inflate shared interests',()=>{
  assert.deepEqual(canonicalInterests(['Games','Jogos','MUSICA','Música']),['Jogos','Música']);
  assert.deepEqual(commonInterests(['Jogos','Animes'],JSON.stringify(['games','anime','Anime'])),['Jogos','Animes']);
});
test('more shared interests rank first; Jaccard resolves ties',()=>{
  const profiles=[{id:'none',interests:['Cinema']},{id:'broad',interests:['Animes','Jogos','Música','Livros','Arte']},{id:'exact',interests:['Games','Anime']}];
  assert.deepEqual(rankByInterests(['Jogos','Animes'],profiles).map(p=>p.id),['exact','broad','none']);
});
test('empty interests have deterministic fallback and inputs are not mutated',()=>{
  const profiles=[{id:'a',interests:[]},{id:'b',interests:['Jogos']}];
  assert.deepEqual(rankByInterests([],profiles),profiles);
  assert.deepEqual(rankByInterests(['Jogos'],profiles).map(p=>p.id),['b','a']);
  assert.equal(profiles[0].id,'a');
  assert.deepEqual(readInterests('invalid JSON'),[]);
});
test('pet aliases and favorites match without mixing artists and movies',()=>{
  assert.deepEqual(commonInterests(['Gatos','Rock','Filme: Interestelar','Artista: Queen'],['cat','ROCK','Filme: INTERESTELAR','Filme: Queen']),['Gatos','Rock','Filme: Interestelar']);
  assert.deepEqual(canonicalInterests(['cães','Cachorros','gato']),['Cachorros','Gatos']);
  assert.deepEqual(readInterests(JSON.stringify(['Filme: Três Homens, um Destino'])),['Filme: Três Homens, um Destino']);
});

test('mutual preferences accept boundaries and reject one-sided age, gender or intentions',async()=>{
 const {mutuallyCompatible,defaultPreferences}=await import('../lib/profile.ts');
 const a={...defaultPreferences,age:22,intent:'Relacionamento',gender:'Mulher',lookingFor:['Homem'],ageMin:21,ageMax:25};
 const b={...defaultPreferences,age:25,intent:'Relacionamento',gender:'Homem',lookingFor:['Mulher'],ageMin:22,ageMax:30};
 assert.equal(mutuallyCompatible(a,b),true);
 assert.equal(mutuallyCompatible(a,{...b,age:26}),false);
 assert.equal(mutuallyCompatible(a,{...b,ageMin:23}),false);
 assert.equal(mutuallyCompatible(a,{...b,lookingFor:['Homem']}),false);
 assert.equal(mutuallyCompatible(a,{...b,desiredIntents:['Amizade']}),false);
});
