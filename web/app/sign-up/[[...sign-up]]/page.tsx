import Link from 'next/link';
import Brand from '@/components/brand';
import {SignUp} from '@clerk/nextjs';
export default function Page(){return <main className="auth-page"><Link href="/" className="brand" aria-label="UniMatch, início"><Brand/></Link><SignUp routing="path" path="/sign-up" signInUrl="/sign-in"/></main>}
