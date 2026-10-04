import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'UniMatch | Unilins',description:'Conexões entre estudantes. Piloto independente para a comunidade Unilins.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/icon-192.png'},appleWebApp:{capable:true,title:'UniMatch',statusBarStyle:'default'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#1749d1'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
