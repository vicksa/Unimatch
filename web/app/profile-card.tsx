'use client';

import type {ReactNode, Ref} from 'react';
import {Check, GraduationCap} from 'lucide-react';
import {readInterests, interestKey} from '@/lib/interests';
import {readList, type ProfilePrompt} from '@/lib/profile';
import {PhotoCarousel} from './photo-gallery';

type PublicProfile = {
  id: string; name: string; age: number; course: string; semester: number;
  bio: string; intent: string; interests: string | string[];
  gender?: string; prompts?: ProfilePrompt[];
};

export default function ProfileCard({person, urls, shared = [], children, cardRef}: {
  person: PublicProfile; urls: string[]; shared?: string[];
  children?: ReactNode; cardRef?: Ref<HTMLElement>;
}) {
  const prompts = readList<ProfilePrompt>(person.prompts);
  return <article ref={cardRef} className="profile-card">
    <PhotoCarousel key={person.id} urls={urls} name={person.name}>{children}</PhotoCarousel>
    <div className="profile-details">
      <div className="name-row"><h2>{person.name}<span>, {person.age}</span></h2><span className="intent-label">{person.intent}</span></div>
      <p className="course"><GraduationCap size={17}/>{person.course}<span>{person.semester}º semestre</span></p>
      {shared.length ? <section className="profile-common" aria-label="Interesses em comum">
        <h3>{shared.length === 1 ? 'Vocês têm um interesse em comum' : `Vocês têm ${shared.length} interesses em comum`}</h3>
        <div className="shared-interests">{shared.map(t => <span key={t}><Check aria-hidden="true"/>{t}</span>)}</div>
      </section> : null}
      <p className="bio">{person.bio}</p>
      {person.gender && person.gender !== 'Prefiro não informar' ? <p className="small">{person.gender}</p> : null}
      <div className="interests">{readInterests(person.interests).filter(t => !shared.some(v => interestKey(v) === interestKey(t))).map(t => <span key={t}>{t}</span>)}</div>
      {prompts.length ? <div className="profile-prompts">{prompts.map(p => <div key={p.question}><h3>{p.question}</h3><p>{p.answer}</p></div>)}</div> : null}
    </div>
  </article>;
}
