'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api/auth';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithTokens } = useAuth();
  const [error, setError] = useState('');
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get('code');
    if (!code) {
      setError('No authorization code received from Google.');
      return;
    }

    const redirectUri = `${window.location.origin}/callback/google`;

    (async () => {
      try {
        const tokens = await authApi.googleCallback(code, redirectUri);
        await loginWithTokens(tokens.access_token, tokens.refresh_token);

        const userData = await authApi.getCurrentUser();
        if (userData.profile_id) {
          router.push('/discover');
        } else {
          router.push('/onboarding');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      }
    })();
  }, [searchParams, loginWithTokens, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060611]">
        <div className="text-center max-w-md px-6">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Sign-in failed</h2>
          <p className="text-sm text-white/40 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] font-semibold px-6 py-2.5 text-sm hover:from-amber-500 hover:to-yellow-600 transition-colors"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060611]">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-amber-400 rounded-full mx-auto mb-4" />
        <p className="text-sm text-white/40">Completing sign-in...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
