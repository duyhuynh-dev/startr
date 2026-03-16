/**
 * Protected Route wrapper - redirects to login if not authenticated,
 * and to onboarding if authenticated but profile not set up
 */

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!user?.profile_id && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [isAuthenticated, isLoading, user?.profile_id, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!user?.profile_id && pathname !== '/onboarding') {
    return null;
  }

  return <>{children}</>;
}

