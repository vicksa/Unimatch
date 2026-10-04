import Link from 'next/link';
import {SignUp} from '@clerk/nextjs';
export default function Page(){return <main className="auth-page"><Link href="/" className="brand">UniMatch</Link><SignUp routing="path" path="/sign-up" signInUrl="/sign-in"/></main>}
