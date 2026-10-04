'use client';
import {useState,type ReactNode} from 'react';
import {Camera,ChevronLeft,ChevronRight,X} from 'lucide-react';
export function PhotoCarousel({urls,name,children}:{urls:string[];name:string;children?:ReactNode}){
 const [index,setIndex]=useState(0);const safeIndex=Math.min(index,Math.max(0,urls.length-1));
 return <div className="portrait">{urls.length?<img key={urls[safeIndex]} src={urls[safeIndex]} alt={'Foto '+(safeIndex+1)+' de '+name}/>:<div className="no-photo">{name[0]}</div>}{children}
 {urls.length>1?<><button type="button" className="gallery-arrow previous" aria-label="Foto anterior" onClick={()=>setIndex((safeIndex+urls.length-1)%urls.length)}><ChevronLeft/></button><button type="button" className="gallery-arrow next" aria-label="Próxima foto" onClick={()=>setIndex((safeIndex+1)%urls.length)}><ChevronRight/></button><div className="gallery-dots" aria-label="Fotos do perfil">{urls.map((_,i)=><button type="button" key={i} aria-label={'Ver foto '+(i+1)} aria-pressed={i===safeIndex} onClick={()=>setIndex(i)}/>)}</div></>:null}
 <span className="photo-index" aria-live="polite">{urls.length?String(safeIndex+1).padStart(2,'0'):'00'} / {String(urls.length).padStart(2,'0')}</span>
 </div>;
}
export function PhotoEditor({slots,url,disabled,onUpload,onRemove}:{slots:number[];url:(slot:number)=>string;disabled:boolean;onUpload:(file:File,slot:number)=>void;onRemove:(slot:number)=>void}){
 return <section className="photo-editor"><h2>Suas fotos</h2><p className="small">Até quatro fotos. Cada envio substitui apenas a posição escolhida. JPG, PNG ou WebP; removemos os metadados originais.</p><div className="photo-grid">{[0,1,2,3].map(slot=><div className="photo-slot" key={slot}>{slots.includes(slot)?<><img src={url(slot)} alt={'Minha foto '+(slot+1)}/><button type="button" className="remove-photo" aria-label={'Remover foto '+(slot+1)} disabled={disabled} onClick={()=>onRemove(slot)}><X size={16}/></button></>:<Camera size={28}/>}<label className={'photo-slot-upload '+(disabled?'disabled':'')}><span>{slots.includes(slot)?'Trocar':'Adicionar'} foto {slot+1}</span><input type="file" accept="image/jpeg,image/png,image/webp" aria-label={'Enviar foto '+(slot+1)} disabled={disabled} onChange={e=>{const file=e.target.files?.[0];if(file)onUpload(file,slot);e.target.value=''}}/></label></div>)}</div></section>;
}
