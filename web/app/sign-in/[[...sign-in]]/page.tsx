import Link from 'next/link';
import {SignIn} from '@clerk/nextjs';
export default function Page(){return <main className="auth-page"><Link href="/" className="brand">UniMatch</Link><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up"/></main>}
