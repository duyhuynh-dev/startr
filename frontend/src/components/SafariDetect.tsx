'use client';

import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';

/**
 * Detects Safari and:
 * 1. Sets data-safari on <html> to disable backdrop-blur in CSS (Safari is very slow with it).
 * 2. Disables all Framer Motion animations (Safari's JS engine struggles with them).
 */
function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
    (navigator.vendor === 'Apple Computer, Inc.' && !(window as Window & { chrome?: unknown }).chrome)
  );
}

export function SafariDetect({ children }: { children: React.ReactNode }) {
  const [safari, setSafari] = useState(false);

  useEffect(() => {
    if (isSafariBrowser()) {
      document.documentElement.setAttribute('data-safari', 'true');
      setSafari(true);
    }
  }, []);

  // In Safari: disable all motion (huge perf win). Otherwise render children as-is.
  if (safari) {
    return (
      <MotionConfig reducedMotion="always">
        {children}
      </MotionConfig>
    );
  }
  return <>{children}</>;
}
