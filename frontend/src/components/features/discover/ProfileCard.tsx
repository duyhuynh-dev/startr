/**
 * Profile Card Component - Display profile in discovery feed
 * Enhanced with smooth animations and transitions
 */

'use client';

import { motion } from 'framer-motion';
import { Button, Card, CardContent } from '@/components/ui';
import type { ProfileCard as ProfileCardType } from '@/lib/api/feed';
import { cardHover } from '@/lib/animations';

interface ProfileCardProps {
  profile: ProfileCardType;
  onLike: (likeType?: 'standard' | 'rose', note?: string, promptId?: string) => void;
  onPass: () => void;
  dailyLimits?: {
    standard_likes_remaining: number;
    roses_remaining: number;
  } | null;
}

export function ProfileCard({ profile, onLike, onPass, dailyLimits }: ProfileCardProps) {
  return (
    <motion.div
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      className="w-full mb-24"
    >
      <Card className="mb-0">
          <CardContent className="p-6">
            {/* Header */}
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-slate-100 mb-2">{profile.full_name}</h2>
              {profile.headline && (
                <p className="text-lg text-slate-100">{profile.headline}</p>
              )}
              {profile.location && (
                <p className="text-sm text-slate-100 mt-1">📍 {profile.location}</p>
              )}
            </motion.div>

            {/* Compatibility Score - Only show if > 0 */}
            {profile.compatibility_score != null && profile.compatibility_score > 0 && (
              <motion.div
                className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <p className="text-sm text-slate-100">
                  Compatibility: <span className="font-semibold">{Math.round(profile.compatibility_score)}%</span>
                </p>
              </motion.div>
            )}

            {/* Prompts */}
            {profile.prompts && profile.prompts.length > 0 && (
              <motion.div
                className="mb-6 space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                {profile.prompts.map((prompt, idx) => (
                  <motion.div
                    key={prompt.prompt_id || idx}
                    className="border-l-4 border-blue-500 pl-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1, duration: 0.3 }}
                  >
                    <p className="text-sm text-slate-100">{prompt.content}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Role-specific info */}
            <motion.div
              className="mb-6 space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              {profile.role === 'investor' && (
                <>
                  {profile.firm && (
                    <p className="text-sm text-slate-100">
                      <span className="font-medium">Firm:</span> {profile.firm}
                    </p>
                  )}
                  {profile.check_size_min && profile.check_size_max && (
                    <p className="text-sm text-slate-100">
                      <span className="font-medium">Check Size:</span> ${profile.check_size_min.toLocaleString()} - ${profile.check_size_max.toLocaleString()}
                    </p>
                  )}
                  {profile.focus_sectors && profile.focus_sectors.length > 0 && (
                    <p className="text-sm text-slate-100">
                      <span className="font-medium">Sectors:</span> {profile.focus_sectors.join(', ')}
                    </p>
                  )}
                  {profile.focus_stages && profile.focus_stages.length > 0 && (
                    <p className="text-sm text-slate-100">
                      <span className="font-medium">Stages:</span> {profile.focus_stages.join(', ')}
                    </p>
                  )}
                </>
              )}

              {profile.role === 'founder' && (
                <>
                  {profile.company_name && (
                    <p className="text-sm text-slate-100">
                      <span className="font-medium">Company:</span> {profile.company_name}
                    </p>
                  )}
                  {profile.revenue_run_rate != null && profile.revenue_run_rate > 0 && (
                    <p className="text-sm text-slate-100">
                      <span className="font-medium">Monthly Revenue:</span> ${profile.revenue_run_rate.toLocaleString()}
                    </p>
                  )}
                  {profile.team_size != null && profile.team_size > 0 && (
                    <p className="text-sm text-slate-100">
                      <span className="font-medium">Team Size:</span> {profile.team_size} people
                    </p>
                  )}
                  {profile.runway_months != null && profile.runway_months > 0 && (
                    <p className="text-sm text-slate-100">
                      <span className="font-medium">Runway:</span> {profile.runway_months} months
                    </p>
                  )}
                </>
              )}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
  );
}
