import {ClerkProvider} from '@clerk/nextjs';
import {ptBR} from '@clerk/localizations';
import type {Metadata,Viewport} from 'next';
import './globals.css';
import './profile-details.css';
import './production-design.css';
const localization={...ptBR,signIn:{...ptBR.signIn,start:{...ptBR.signIn?.start,subtitle:'Entre na sua conta UniMatch'}},signUp:{...ptBR.signUp,start:{...ptBR.signUp?.start,subtitle:'Crie sua conta para conhecer pessoas do campus'}}};
export const metadata:Metadata={title:'UniMatch | Unilins',description:'Amizade, encontros e conversas entre estudantes da Unilins. Encontre pessoas com gostos em comum.',manifest:'/manifest.webmanifest',icons:{icon:'/unimatch-logo.png',apple:'/unimatch-logo.png'},appleWebApp:{capable:true,title:'UniMatch',statusBarStyle:'default'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#6d4aff'};
export default function RootLayout({children}:{children:React.ReactNode}){return <ClerkProvider appearance={{variables:{colorPrimary:'#6d4aff',colorForeground:'#292438',colorBackground:'#ffffff',borderRadius:'0.875rem',fontFamily:'Inter, ui-sans-serif, system-ui, sans-serif'}}} localization={localization} signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/"><html lang="pt-BR"><body>{children}</body></html></ClerkProvider>}
