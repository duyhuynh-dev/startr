/**
 * Page Transition Wrapper
 * Provides smooth page transitions for route changes
 */

'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { fadeIn, slideUp } from '@/lib/animations';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  variant?: 'fade' | 'slideUp';
}

export function PageTransition({ children, className = '', variant = 'slideUp' }: PageTransitionProps) {
  const variants = variant === 'fade' ? fadeIn : slideUp;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

