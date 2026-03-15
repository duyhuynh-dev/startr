/**
 * Profile Card – Clean light theme for Contra-style discover feed
 */

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { ProfileCard as ProfileCardType } from '@/lib/api/feed';

function formatLastActive(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

interface ProfileCardProps {
  profile: ProfileCardType;
  onLike: (likeType?: 'standard' | 'rose', note?: string, promptId?: string) => void;
  onPass: () => void;
  onViewDiligence?: () => void;
  dailyLimits?: {
    standard_likes_remaining: number;
    roses_remaining: number;
  } | null;
}

export function ProfileCard({ profile, onLike, onPass, onViewDiligence, dailyLimits }: ProfileCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-lg font-semibold text-white/70">
                  {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              {profile.is_online && (
                <span
                  className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#060611]"
                  title="Online now"
                />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{profile.full_name}</h2>
              {(profile.is_online || profile.last_active_at) && (
                <p className="text-xs text-white/40 mt-0.5">
                  {profile.is_online ? 'Online now' : profile.last_active_at ? `Active ${formatLastActive(profile.last_active_at)}` : null}
                </p>
              )}
              {profile.headline && (
                <p className="text-sm text-white/40">{profile.headline}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                {profile.location && (
                  <span className="text-xs text-white/30">{profile.location}</span>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-white/50">
                  {profile.role}
                </span>
              </div>
            </div>
          </div>

          {profile.compatibility_score != null && profile.compatibility_score > 0 && (
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-white">{Math.round(profile.compatibility_score)}%</div>
              <div className="text-[10px] uppercase tracking-wider text-white/30 font-medium">match</div>
            </div>
          )}
        </div>

        {/* Prompts */}
        {profile.prompts && profile.prompts.length > 0 && (
          <div className="mb-5 space-y-3">
            {profile.prompts.map((prompt, idx) => (
              <div key={prompt.prompt_id || idx} className="bg-white/3 rounded-xl p-4">
                <p className="text-sm text-white/70 leading-relaxed">{prompt.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Role-specific details */}
        <div className="space-y-0">
          {profile.role === 'investor' && (
            <div className="grid grid-cols-2 gap-3">
              {profile.firm && (
                <div className="bg-white/3 rounded-xl px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Firm</p>
                  <p className="text-sm font-medium text-white">{profile.firm}</p>
                </div>
              )}
              {profile.check_size_min && profile.check_size_max && (
                <div className="bg-white/3 rounded-xl px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Check size</p>
                  <p className="text-sm font-medium text-white">
                    ${(profile.check_size_min / 1000).toFixed(0)}k – ${(profile.check_size_max / 1000).toFixed(0)}k
                  </p>
                </div>
              )}
              {profile.focus_sectors && profile.focus_sectors.length > 0 && (
                <div className="bg-white/3 rounded-xl px-4 py-3 col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-1.5">Sectors</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.focus_sectors.map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {profile.focus_stages && profile.focus_stages.length > 0 && (
                <div className="bg-white/3 rounded-xl px-4 py-3 col-span-2">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-1.5">Stages</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.focus_stages.map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {profile.role === 'founder' && (
            <div className="grid grid-cols-2 gap-3">
              {profile.company_name && (
                <div className="bg-white/3 rounded-xl px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Company</p>
                  <p className="text-sm font-medium text-white">{profile.company_name}</p>
                </div>
              )}
              {profile.revenue_run_rate != null && profile.revenue_run_rate > 0 && (
                <div className="bg-white/3 rounded-xl px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">MRR</p>
                  <p className="text-sm font-medium text-white">${profile.revenue_run_rate.toLocaleString()}</p>
                </div>
              )}
              {profile.team_size != null && profile.team_size > 0 && (
                <div className="bg-white/3 rounded-xl px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Team</p>
                  <p className="text-sm font-medium text-white">{profile.team_size} people</p>
                </div>
              )}
              {profile.runway_months != null && profile.runway_months > 0 && (
                <div className="bg-white/3 rounded-xl px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Runway</p>
                  <p className="text-sm font-medium text-white">{profile.runway_months} months</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* View profile & Due Diligence */}
        <div className="mt-4 flex items-center gap-4">
          <Link
            href={`/profile/${profile.id}`}
            className="flex items-center gap-2 text-sm font-medium text-white/40 hover:text-white/70 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            View full profile
          </Link>
          {onViewDiligence && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewDiligence(); }}
              className="flex items-center gap-2 text-sm font-medium text-white/40 hover:text-white/70 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Due Diligence
            </button>
          )}
        </div>
      </div>

      {/* Action bar at bottom of card */}
      <div className="border-t border-white/5 px-6 py-4 flex gap-3">
        <motion.button
          type="button"
          onClick={onPass}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white/50 hover:bg-white/5 transition-colors"
        >
          Pass
        </motion.button>
        <motion.button
          type="button"
          onClick={() => onLike('standard')}
          disabled={(dailyLimits?.standard_likes_remaining ?? 1) <= 0}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 py-2.5 rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] text-sm font-semibold hover:from-amber-500 hover:to-yellow-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Interested
        </motion.button>
      </div>
    </motion.div>
  );
}
