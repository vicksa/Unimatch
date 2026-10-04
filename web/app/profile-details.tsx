'use client';
import {genders,intentions,promptQuestions,type Preferences,type ProfilePrompt} from '@/lib/profile';
export type ProfileDetails=Preferences&{prompts:ProfilePrompt[]};
export default function ProfileDetailsFields({value,onChange,disabled=false}:{value:ProfileDetails;onChange:(v:ProfileDetails)=>void;disabled?:boolean}){
 function toggle(field:'lookingFor'|'desiredIntents',label:string){const values=value[field];onChange({...value,[field]:values.includes(label)?values.filter(x=>x!==label):[...values,label]})}
 return <fieldset className="profile-extra-fields" disabled={disabled}>
  <legend>Quem você quer conhecer?</legend>
  <label>Meu gênero<select aria-label="Meu gênero" value={value.gender} onChange={e=>onChange({...value,gender:e.target.value})}>{genders.map(g=><option key={g}>{g}</option>)}</select></label>
  <p className="small">Se informado, seu gênero aparece no perfil. Suas preferências abaixo são privadas e precisam combinar com as da outra pessoa.</p>
  <div><p className="field-title">Quero conhecer</p><div className="interest-options"><button type="button" aria-pressed={!value.lookingFor.length} onClick={()=>onChange({...value,lookingFor:[]})}>Todos os gêneros</button>{genders.map(g=><button key={g} type="button" aria-pressed={value.lookingFor.includes(g)} onClick={()=>toggle('lookingFor',g)}>{g==='Prefiro não informar'?'Gênero não informado':g}</button>)}</div></div>
  <div className="form-row"><label>Idade mínima<input type="number" required min={18} max={100} value={value.ageMin} onChange={e=>onChange({...value,ageMin:Number(e.target.value)})}/></label><label>Idade máxima<input type="number" required min={value.ageMin} max={100} value={value.ageMax} onChange={e=>onChange({...value,ageMax:Number(e.target.value)})}/></label></div>
  {value.ageMin>value.ageMax?<p role="alert" className="small">A idade máxima deve ser maior ou igual à mínima.</p>:null}
  <div><p className="field-title">Intenções que combinam comigo</p><div className="interest-options"><button type="button" aria-pressed={!value.desiredIntents.length} onClick={()=>onChange({...value,desiredIntents:[]})}>Todas as intenções</button>{intentions.map(i=><button key={i} type="button" aria-pressed={value.desiredIntents.includes(i)} onClick={()=>toggle('desiredIntents',i)}>{i}</button>)}</div></div>
  <div className="prompt-editor"><h2>Um pouco mais sobre você</h2><p className="small">Até três perguntas opcionais, com respostas de até 200 caracteres. Elas aparecem no perfil e ajudam a começar o papo.</p>
   {value.prompts.map((prompt,index)=><div className="prompt-answer" key={index}><label>Pergunta {index+1}<select aria-label={'Pergunta '+(index+1)} value={prompt.question} onChange={e=>onChange({...value,prompts:value.prompts.map((p,i)=>i===index?{...p,question:e.target.value as ProfilePrompt['question']}:p)})}>{promptQuestions.filter(q=>q===prompt.question||!value.prompts.some(p=>p.question===q)).map(q=><option key={q}>{q}</option>)}</select></label><label>Sua resposta {index+1}<textarea aria-label={'Sua resposta '+(index+1)} rows={3} maxLength={200} value={prompt.answer} onChange={e=>onChange({...value,prompts:value.prompts.map((p,i)=>i===index?{...p,answer:e.target.value}:p)})}/><span className="small">{prompt.answer.length}/200</span></label><button className="text-button danger" type="button" onClick={()=>onChange({...value,prompts:value.prompts.filter((_,i)=>i!==index)})}>Remover pergunta {index+1}</button></div>)}
   {value.prompts.length<3?<button type="button" className="secondary" onClick={()=>{const question=promptQuestions.find(q=>!value.prompts.some(p=>p.question===q))!;onChange({...value,prompts:[...value.prompts,{question,answer:''}]})}}>Adicionar pergunta</button>:null}
  </div>
 </fieldset>;
}
