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
