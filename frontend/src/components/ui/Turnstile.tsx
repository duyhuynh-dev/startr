'use client';

import { useCallback, useEffect, useState } from 'react';
import { Turnstile as TurnstileWidget } from '@marsidev/react-turnstile';
import { authApi } from '@/lib/api/auth';

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  onReady?: (enabled: boolean) => void;
  className?: string;
}

export function Turnstile({ onVerify, onExpire, onError, onReady, className }: TurnstileProps) {
  const [siteKey, setSiteKey] = useState<string>('');

  useEffect(() => {
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

  if (!siteKey) return null;

  return (
    <div className={className}>
      <TurnstileWidget
        siteKey={siteKey}
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
