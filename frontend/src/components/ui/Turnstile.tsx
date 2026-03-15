'use client';

import { useCallback, useEffect, useState } from 'react';
import { Turnstile as TurnstileWidget } from '@marsidev/react-turnstile';
import { authApi } from '@/lib/api/auth';

/** Use production Turnstile key in deployment: set NEXT_PUBLIC_TURNSTILE_SITE_KEY in Vercel (or your host) to your Cloudflare Turnstile *production* site key. Leave unset in dev to use the key from the API (backend env). */
const DEPLOY_SITE_KEY = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '' : '';

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  onReady?: (enabled: boolean) => void;
  className?: string;
}

export function Turnstile({ onVerify, onExpire, onError, onReady, className }: TurnstileProps) {
  const [siteKey, setSiteKey] = useState<string>(DEPLOY_SITE_KEY);

  useEffect(() => {
    if (DEPLOY_SITE_KEY) {
      onReady?.(true);
      return;
    }
    authApi.getTurnstileSiteKey().then((key) => {
      setSiteKey(key);
      onReady?.(!!key);
    });
  }, [onReady]);

  const handleSuccess = useCallback(
    (token: string) => {
      onVerify(token);
    },
    [onVerify]
  );

  const keyToUse = siteKey || DEPLOY_SITE_KEY;
  if (!keyToUse) return null;

  return (
    <div className={className}>
      <TurnstileWidget
        siteKey={keyToUse}
        onSuccess={handleSuccess}
        onExpire={onExpire}
        onError={onError}
        options={{
          theme: 'light',
          size: 'normal',
        }}
      />
    </div>
  );
}
