'use client';
import {canonicalInterests,interestKey,suggestedInterests} from '@/lib/interests';

export default function InterestPicker({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
  const selected=canonicalInterests(value.split(',').filter(v=>v.trim()));
  const keys=new Set(selected.map(interestKey));
  function toggle(label:string){
    const key=interestKey(label);
    const next=keys.has(key)?selected.filter(v=>interestKey(v)!==key):[...selected,label];
    onChange(next.join(', '));
  }
  return <fieldset className="interest-picker" disabled={disabled}>
    <legend>Interesses</legend>
    <p className="small">Escolha até 8. Eles ajudam a recomendar pessoas com gostos em comum.</p>
    <div className="interest-options">{suggestedInterests.map(label=><button key={label} type="button" aria-pressed={keys.has(interestKey(label))} disabled={!keys.has(interestKey(label))&&selected.length>=8} onClick={()=>toggle(label)}>{label}</button>)}</div>
    <label htmlFor="custom-interests">Seus interesses e outros gostos<input id="custom-interests" maxLength={220} value={value} onChange={e=>onChange(e.target.value)} placeholder="Jogos, Animes, Música, Valorant, Rock…"/></label>
    <span className="small" aria-live="polite">{selected.length}/8 interesses. Para adicionar outro, separe por vírgula.</span>
  </fieldset>;
}
