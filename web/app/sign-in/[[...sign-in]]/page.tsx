import Link from 'next/link';
import Brand from '@/components/brand';
import {SignIn} from '@clerk/nextjs';
export default function Page(){return <main className="auth-page"><Link href="/" className="brand" aria-label="UniMatch, início"><Brand/></Link><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up"/></main>}
