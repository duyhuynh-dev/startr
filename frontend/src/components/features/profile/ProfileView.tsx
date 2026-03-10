/**
 * Read-only profile view for viewing other users' profiles
 */

'use client';

import type { BaseProfile } from '@/lib/api/types';

interface ProfileViewProps {
  profile: BaseProfile;
  isOnline?: boolean;
  lastActiveAt?: string | null;
}

export function ProfileView({ profile, isOnline, lastActiveAt }: ProfileViewProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-xl font-semibold text-slate-700">
              {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="Online now" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{profile.full_name}</h2>
          <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">
            {profile.role}
          </span>
          {(isOnline || lastActiveAt) && (
            <p className="text-xs text-slate-500 mt-1">
              {isOnline ? 'Online now' : lastActiveAt ? `Active ${formatLastActive(lastActiveAt)}` : null}
            </p>
          )}
        </div>
      </div>

      {profile.headline && (
        <p className="text-sm text-slate-600 mb-4">{profile.headline}</p>
      )}
      {profile.location && (
        <p className="text-sm text-slate-500 mb-4">{profile.location}</p>
      )}

      {profile.prompts && profile.prompts.length > 0 && (
        <div className="space-y-3 mb-6">
          {profile.prompts.map((p, idx) => (
            <div key={p.prompt_id || idx} className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm text-slate-700 leading-relaxed">{p.content}</p>
            </div>
          ))}
        </div>
      )}

      {profile.role === 'investor' && (
        <div className="grid grid-cols-2 gap-3">
          {profile.firm && (
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">Firm</p>
              <p className="text-sm font-medium text-slate-900">{profile.firm}</p>
            </div>
          )}
          {profile.check_size_min != null && profile.check_size_max != null && (
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">Check size</p>
              <p className="text-sm font-medium text-slate-900">
                ${(profile.check_size_min / 1000).toFixed(0)}k – ${(profile.check_size_max / 1000).toFixed(0)}k
              </p>
            </div>
          )}
          {profile.focus_sectors && profile.focus_sectors.length > 0 && (
            <div className="bg-slate-50 rounded-xl px-4 py-3 col-span-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1.5">Sectors</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.focus_sectors.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">{s}</span>
                ))}
              </div>
            </div>
          )}
          {profile.focus_stages && profile.focus_stages.length > 0 && (
            <div className="bg-slate-50 rounded-xl px-4 py-3 col-span-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1.5">Stages</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.focus_stages.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {profile.role === 'founder' && (
        <div className="grid grid-cols-2 gap-3">
          {profile.company_name && (
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">Company</p>
              <p className="text-sm font-medium text-slate-900">{profile.company_name}</p>
            </div>
          )}
          {profile.company_url && (
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">Website</p>
              <a href={profile.company_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate block">
                {profile.company_url}
              </a>
            </div>
          )}
          {profile.revenue_run_rate != null && profile.revenue_run_rate > 0 && (
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">MRR</p>
              <p className="text-sm font-medium text-slate-900">${profile.revenue_run_rate.toLocaleString()}</p>
            </div>
          )}
          {profile.team_size != null && profile.team_size > 0 && (
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">Team</p>
              <p className="text-sm font-medium text-slate-900">{profile.team_size} people</p>
            </div>
          )}
          {profile.runway_months != null && profile.runway_months > 0 && (
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-0.5">Runway</p>
              <p className="text-sm font-medium text-slate-900">{profile.runway_months} months</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
