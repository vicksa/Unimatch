'use client';
import {useId,useState} from 'react';
import {canonicalInterests,interestKey,interestCategories,MAX_INTERESTS,MAX_INTEREST_LENGTH} from '@/lib/interests';

export default function InterestPicker({value,onChange,disabled=false}:{value:string[];onChange:(value:string[])=>void;disabled?:boolean}){
  const selected=canonicalInterests(value);
  const keys=new Set(selected.map(interestKey));
  const full=selected.length>=MAX_INTERESTS;
  const id=useId();
  const [drafts,setDrafts]=useState<Record<string,string>>({});
  const [notice,setNotice]=useState('');
  function toggle(label:string){
    const key=interestKey(label);
    if(!keys.has(key)&&full)return;
    onChange(keys.has(key)?selected.filter(v=>interestKey(v)!==key):[...selected,label]);
    setNotice('');
  }
  function add(kind:string,prefix:string){
    const text=(drafts[kind]||'').trim().replace(/\s+/g,' ');
    if(!text||full)return;
    const label=prefix+text;
    if(keys.has(interestKey(label))){setNotice('Esse gosto já está selecionado.');return;}
    onChange([...selected,label]);setDrafts({...drafts,[kind]:''});setNotice('');
  }
  return <fieldset className="interest-picker" disabled={disabled}>
    <legend>Interesses e favoritos</legend>
    <p className="small">Escolha até {MAX_INTERESTS} gostos. Eles ajudam a recomendar pessoas com interesses em comum.</p>
    <span className="small" aria-live="polite">{selected.length}/{MAX_INTERESTS} interesses{full?' — remova um para adicionar outro.':''}</span>
    {selected.length>0?<div className="interest-options selected-interests" aria-label="Interesses selecionados">{selected.map(label=><button key={interestKey(label)} type="button" aria-label={'Remover '+label} onClick={()=>toggle(label)}>{label} ×</button>)}</div>:null}
    {interestCategories.map(category=><details key={category.name} className="interest-category">
      <summary>{category.name}<span>{category.options.filter(label=>keys.has(interestKey(label))).length} selecionados</span></summary>
      <div className="interest-options">{category.options.map(label=><button key={label} type="button" aria-pressed={keys.has(interestKey(label))} disabled={!keys.has(interestKey(label))&&full} onClick={()=>toggle(label)}>{label}</button>)}</div>
    </details>)}
    {[
      {kind:'artist',label:'Artista ou banda favorita',prefix:'Artista: ',placeholder:'Ex.: Taylor Swift, Linkin Park'},
      {kind:'movie',label:'Filme favorito',prefix:'Filme: ',placeholder:'Ex.: Interestelar'},
      {kind:'other',label:'Outro hobby ou interesse',prefix:'',placeholder:'Ex.: Colecionar discos'},
    ].map(({kind,label,prefix,placeholder})=><div key={kind} className="favorite-field"><label htmlFor={id+kind}>{label}</label><div className="favorite-input"><input id={id+kind} value={drafts[kind]||''} maxLength={MAX_INTEREST_LENGTH-prefix.length} disabled={full} placeholder={placeholder} onChange={e=>setDrafts({...drafts,[kind]:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add(kind,prefix);}}}/><button className="secondary" type="button" disabled={full||!(drafts[kind]||'').trim()} onClick={()=>add(kind,prefix)} aria-label={'Adicionar '+label.toLowerCase()}>Adicionar</button></div></div>)}
    <p className="small">Adicione um favorito por vez. Pets são os animais de que você gosta; não precisa ter um.</p>
    {notice?<p className="small" role="status">{notice}</p>:null}
  </fieldset>;
}
