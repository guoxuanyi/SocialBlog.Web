'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { routes } from '@/lib/routes';
import { useAuth } from '@/components/AuthProvider';

export default function ProfileIndex() {
  const router = useRouter();
  const { state } = useAuth();

  useEffect(() => {
    if (state.status === 'loading') return;
    if (state.status === 'authenticated') {
      router.replace(routes.profile(state.user.id));
      return;
    }
    router.replace(routes.auth.login());
  }, [router, state]);

  return null;
}
