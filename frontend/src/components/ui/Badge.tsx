/**
 * Verification Badge Component
 * Displays verification status badges with icons and tooltips
 */

import { motion } from 'framer-motion';

export type BadgeType = 'email' | 'domain' | 'linkedin' | 'google' | 'manual' | 'accredited';

export interface BadgeProps {
  type: BadgeType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const BADGE_CONFIG: Record<BadgeType, { icon: string; label: string; color: string; bgColor: string; borderColor: string }> = {
  email: {
    icon: '✉️',
    label: 'Email Verified',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/40',
  },
  domain: {
    icon: '🏢',
    label: 'Domain Verified',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/40',
  },
  linkedin: {
    icon: '💼',
    label: 'LinkedIn Verified',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/20',
    borderColor: 'border-sky-500/40',
  },
  google: {
    icon: '🔐',
    label: 'Google Verified',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/40',
  },
  manual: {
    icon: '✅',
    label: 'Manually Reviewed',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/40',
  },
  accredited: {
    icon: '⭐',
    label: 'Accredited Investor',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/40',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function Badge({ type, size = 'md', showLabel = false, className = '' }: BadgeProps) {
  const config = BADGE_CONFIG[type];
  
  if (!config) {
    return null;
  }

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${config.bgColor} ${config.borderColor} ${config.color}
        ${SIZE_CLASSES[size]}
        ${className}
      `}
      title={config.label}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </motion.span>
  );
}

export interface VerificationBadgesProps {
  badges: string[];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  maxBadges?: number;
  className?: string;
}

export function VerificationBadges({
  badges,
  size = 'sm',
  showLabels = false,
  maxBadges,
  className = '',
}: VerificationBadgesProps) {
  const displayBadges = maxBadges ? badges.slice(0, maxBadges) : badges;
  const remainingCount = maxBadges && badges.length > maxBadges ? badges.length - maxBadges : 0;

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {displayBadges.map((badge) => (
        <Badge key={badge} type={badge as BadgeType} size={size} showLabel={showLabels} />
      ))}
      {remainingCount > 0 && (
        <span className="text-slate-400 text-xs">+{remainingCount} more</span>
      )}
    </div>
  );
}

export interface VerificationLevelBadgeProps {
  level: number;
  levelName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LEVEL_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  0: { bg: 'bg-slate-500/20', border: 'border-slate-500/40', text: 'text-slate-400' },
  1: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400' },
  2: { bg: 'bg-sky-500/20', border: 'border-sky-500/40', text: 'text-sky-400' },
  3: { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-400' },
  4: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400' },
  5: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400' },
};

const LEVEL_ICONS: Record<number, string> = {
  0: '○',
  1: '◐',
  2: '◑',
  3: '◕',
  4: '●',
  5: '★',
};

export function VerificationLevelBadge({
  level,
  levelName,
  size = 'md',
  className = '',
}: VerificationLevelBadgeProps) {
  const colors = LEVEL_COLORS[level] || LEVEL_COLORS[0];
  const icon = LEVEL_ICONS[level] || LEVEL_ICONS[0];

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${colors.bg} ${colors.border} ${colors.text}
        ${SIZE_CLASSES[size]}
        ${className}
      `}
      title={levelName || `Level ${level}`}
    >
      <span>{icon}</span>
      <span>Level {level}</span>
      {levelName && size !== 'sm' && <span className="text-slate-400">• {levelName}</span>}
    </motion.span>
  );
}

export default Badge;
