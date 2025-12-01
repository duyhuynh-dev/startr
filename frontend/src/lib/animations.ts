/**
 * Animation utilities and constants
 * Centralized animation configurations for consistent UI/UX
 */

export const animationConfig = {
  // Timing durations (in seconds)
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  
  // Easing functions
  easeOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  bounce: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
  
  // Spring configurations
  spring: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },
  
  // Stagger delays
  stagger: {
    fast: 0.05,
    normal: 0.1,
    slow: 0.15,
  },
};

/**
 * Common animation variants for Framer Motion
 */
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: animationConfig.normal, ease: animationConfig.easeOut }
  },
};

// Fast page transition - for snappy page changes
export const pageFadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.1, ease: animationConfig.easeOut }
  },
};

export const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: animationConfig.normal, ease: animationConfig.easeOut }
  },
};

export const slideDown = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: animationConfig.normal, ease: animationConfig.easeOut }
  },
};

export const slideLeft = {
  hidden: { opacity: 0, x: 100 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: animationConfig.normal, ease: animationConfig.easeOut }
  },
  exit: {
    opacity: 0,
    x: -100,
    transition: { duration: animationConfig.fast, ease: animationConfig.easeOut }
  },
};

export const slideRight = {
  hidden: { opacity: 0, x: -100 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: animationConfig.normal, ease: animationConfig.easeOut }
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: { duration: animationConfig.fast, ease: animationConfig.easeOut }
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: animationConfig.normal, ease: animationConfig.easeOut }
  },
};

export const cardHover = {
  rest: {
    scale: 1,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    transition: { duration: animationConfig.fast },
  },
  hover: {
    scale: 1.02,
    boxShadow: '0 10px 25px 0 rgba(0, 0, 0, 0.15)',
    transition: { duration: animationConfig.fast },
  },
};

/**
 * Stagger container variants for lists
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: animationConfig.stagger.normal,
    },
  },
};

