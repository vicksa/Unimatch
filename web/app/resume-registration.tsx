'use client';

import {useClerk} from '@clerk/nextjs';
import {usePathname, useRouter} from 'next/navigation';
import {useEffect} from 'react';

// Clerk owns the attempt and verification state. Never persist a password or OTP.
export default function ResumeRegistration() {
  const clerk = useClerk();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!clerk.loaded || pathname !== '/') return;
    return clerk.addListener(({client, session}) => {
      const attempt = client?.signUp;
      if (session || !attempt || attempt.status !== 'missing_requirements') return;
      if (attempt.missingFields.length === 0 && attempt.unverifiedFields.includes('email_address')) {
        router.replace('/sign-up/verify-email-address');
      }
    });
  }, [clerk, clerk.loaded, pathname, router]);
  return null;
}
