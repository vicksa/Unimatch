import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import Brand from '@/components/brand';

export default function Welcome({onExplore}:{onExplore:()=>void}){
 return <main className="welcome-page">
  <header className="welcome-header"><Link href="/" aria-label="UniMatch, início"><Brand/></Link><span>Unilins · 18+</span></header>
  <section className="access-panel">
   <p className="access-context">Para estudantes da Unilins</p>
   <h1>Conheça gente<br/>da faculdade.</h1>
   <p className="access-description">Veja os perfis, encontre interesses em comum e converse depois do match.</p>
   <div className="access-actions"><Link className="primary" href="/sign-in">Entrar <ArrowRight size={18}/></Link><Link className="secondary" href="/sign-up">Criar conta</Link></div>
   <button className="text-button access-demo" onClick={onExplore}>Ver demonstração</button>
   <p className="access-note">Seu e-mail não aparece no perfil.<br/>Somente para maiores de 18 anos.</p>
  </section>
  <footer className="welcome-footer">Projeto independente. Sem vínculo oficial com a Unilins.</footer>
 </main>;
}
