import Image from 'next/image';

export default function Brand({compact=false}:{compact?:boolean}){
 return <span className={'brand-lockup'+(compact?' compact':'')}><Image src="/unimatch-logo.png" alt="" width={44} height={44} className="brand-symbol"/><span className="brand-word">UniMatch<span className="brand-caption">conexões no campus</span></span></span>;
}
