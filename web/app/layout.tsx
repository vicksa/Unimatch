import {ClerkProvider} from '@clerk/nextjs';
import {ptBR} from '@clerk/localizations';
import type {Metadata,Viewport} from 'next';
import './globals.css';
import './profile-details.css';
export const metadata:Metadata={title:'UniMatch | Unilins',description:'Conexões entre estudantes. Piloto independente para a comunidade Unilins.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/icon-192.png'},appleWebApp:{capable:true,title:'UniMatch',statusBarStyle:'default'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#1749d1'};
export default function RootLayout({children}:{children:React.ReactNode}){return <ClerkProvider localization={ptBR} signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/"><html lang="pt-BR"><body>{children}</body></html></ClerkProvider>}
