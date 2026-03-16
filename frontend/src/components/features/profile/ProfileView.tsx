/**
 * Read-only profile view for viewing other users' profiles
 */

'use client';

import { useState } from 'react';
import type { BaseProfile } from '@/lib/api/types';

interface ProfileViewProps {
  profile: BaseProfile;
  isOnline?: boolean;
  lastActiveAt?: string | null;
}

/** Holistic venture fit: financials + market position + profile strength + balance (no single-metric thresholds). */
function getHolisticFitScore(profile: BaseProfile): number {
  const teamSize = Math.max(1, profile.team_size ?? 1);
  const rev = profile.revenue_run_rate ?? 0;
  const runwayMonths = profile.runway_months ?? 0;
  const fundingPerHead = (rev * 12) / teamSize;

  const revNorm = Math.min(1, fundingPerHead / 1_500_000);
  const runwayNorm = Math.min(1, runwayMonths / 24);
  const financialScore = 0.6 * revNorm + 0.4 * runwayNorm;

  let marketScore = 0.5;
  const hasEnrichment =
    !!profile.market_sentiment || !!profile.niche_moat || (profile.competitor_gap?.length ?? 0) > 0;
  if (hasEnrichment) {
    const sentimentPositive = /positive|strong|bullish|favorable/i.test(profile.market_sentiment ?? '') ? 1 : 0.5;
    const hasMoat = (profile.niche_moat?.length ?? 0) > 20 ? 1 : 0.5;
    const hasGap = (profile.competitor_gap?.length ?? 0) > 0 ? 1 : 0;
    marketScore = Math.min(1, 0.4 * sentimentPositive + 0.4 * hasMoat + 0.2 * hasGap);
  }

  const promptsWithContent = (profile.prompts ?? []).filter((p) => p?.content?.trim()).length;
  const promptScore = Math.min(1, promptsWithContent / 3) * 0.4;
  const hasMarkets = (profile.focus_markets?.length ?? 0) > 0 ? 0.2 : 0;
  const hasRevenue = (profile.revenue_run_rate ?? 0) > 0 ? 0.2 : 0;
  const hasRunway = (profile.runway_months ?? 0) > 0 ? 0.2 : 0;
  const profileStrengthScore = promptScore + hasMarkets + hasRevenue + hasRunway;

  const runwayOk = Math.min(1, runwayMonths / 18);
  const teamReasonable = teamSize >= 2 && teamSize <= 50 ? 1 : teamSize < 2 ? 0.5 : 0.8;
  const balanceScore = runwayOk * 0.6 + teamReasonable * 0.4;

  const composite =
    0.3 * financialScore + 0.3 * marketScore + 0.2 * profileStrengthScore + 0.2 * balanceScore;
  return Math.min(1, composite);
}

function VentureFitBar({ profile }: { profile: BaseProfile }) {
  if (profile.role !== 'founder') return null;
  const composite = getHolisticFitScore(profile);
  const pct = Math.min(100, Math.round(composite * 100));
  const label =
    composite >= 0.6 ? 'Strong fit' : composite >= 0.35 ? 'Moderate fit' : 'Building traction';
  const barColor =
    composite >= 0.6 ? 'bg-emerald-500' : composite >= 0.35 ? 'bg-amber-500' : 'bg-white/30';
  const hasEnrichment =
    !!profile.market_sentiment || !!profile.niche_moat || (profile.competitor_gap?.length ?? 0) > 0;
  return (
    <div className="col-span-2 bg-white/5 rounded-xl px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-1.5" title="Financials, market position, profile strength, and balance">
        Venture fit
      </p>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(10, pct)}%` }} />
      </div>
      <p className="text-xs text-white/50 mt-1">{label}</p>
      {!hasEnrichment && (
        <p className="text-[10px] text-white/30 mt-0.5">Based on profile data only</p>
      )}
    </div>
  );
}

function LogicTraceModal({ onClose, sources }: { onClose: () => void; sources?: string[] }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-[#0d0e1a] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-2">How venture fit is calculated</h3>
        <p className="text-sm text-white/70 mb-4">
          Venture fit is a holistic score, not based on revenue or market cap alone. It combines: (1) financial sustainability — revenue per head and runway on a smooth scale; (2) market and positioning — sentiment, niche moat, and differentiators when enrichment data is available; (3) profile strength — completeness and diversity of signals (prompts, focus markets, disclosed metrics); (4) balance — runway vs team size and sustainable growth. Public and third-party signals (e.g. Crunchbase, SEC) are used where available for enrichment.
        </p>
        {sources && sources.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-2">Sources</p>
            <ul className="text-xs text-white/60 space-y-1">
              {sources.map((url, i) => (
                <li key={i}><a href={url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline truncate block">{url}</a></li>
              ))}
            </ul>
          </div>
        )}
        <button type="button" onClick={onClose} className="w-full py-2 rounded-xl bg-white/10 text-sm font-medium text-white hover:bg-white/15">Close</button>
      </div>
    </div>
  );
}

export function ProfileView({ profile, isOnline, lastActiveAt }: ProfileViewProps) {
  const [logicTraceOpen, setLogicTraceOpen] = useState(false);
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-semibold text-white/70">
              {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#060611]" title="Online now" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{profile.full_name ?? 'Someone'}</h2>
          <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-white/50">
            {profile.role}
          </span>
          {(isOnline || lastActiveAt) && (
            <p className="text-xs text-white/40 mt-1">
              {isOnline ? 'Online now' : lastActiveAt ? `Active ${formatLastActive(lastActiveAt)}` : null}
            </p>
          )}
        </div>
      </div>

      {profile.headline && (
        <p className="text-sm text-white/50 mb-4">{profile.headline}</p>
      )}
      {profile.location && (
        <p className="text-sm text-white/40 mb-4">{profile.location}</p>
      )}

      {profile.prompts && profile.prompts.length > 0 && (
        <div className="space-y-3 mb-6">
          {profile.prompts.map((p, idx) => (
            <div key={p.prompt_id || idx} className="bg-white/3 rounded-xl p-4">
              <p className="text-sm text-white/70 leading-relaxed">{(p.content ?? '').trim() || '—'}</p>
            </div>
          ))}
        </div>
      )}

      {profile.role === 'investor' && (
        <div className="grid grid-cols-2 gap-3">
          {profile.firm && (
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Firm</p>
              <p className="text-sm font-medium text-white">{profile.firm}</p>
            </div>
          )}
          {profile.check_size_min != null && profile.check_size_max != null && (
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Check size</p>
              <p className="text-sm font-medium text-white">
                ${(profile.check_size_min / 1000).toFixed(0)}k – ${(profile.check_size_max / 1000).toFixed(0)}k
              </p>
            </div>
          )}
          {profile.focus_sectors && profile.focus_sectors.length > 0 && (
            <div className="bg-white/5 rounded-xl px-4 py-3 col-span-2">
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-1.5">Sectors</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.focus_sectors.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">{s}</span>
                ))}
              </div>
            </div>
          )}
          {profile.focus_stages && profile.focus_stages.length > 0 && (
            <div className="bg-white/5 rounded-xl px-4 py-3 col-span-2">
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
            <div className="bg-white/5 rounded-xl px-4 py-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Company</p>
                <p className="text-sm font-medium text-white">{profile.company_name}</p>
              </div>
              {profile.niche_moat && (
                <div className="group relative shrink-0">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400" title="Market Intelligence" aria-label="AI-generated market insight">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </span>
                  <div className="absolute right-0 top-full z-10 mt-1 hidden w-72 rounded-lg border border-white/10 bg-[#0d0e1a] p-3 text-xs text-white/80 shadow-xl group-hover:block">
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/80 mb-1">Market Intelligence</p>
                    <p>{profile.niche_moat}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          {profile.company_url && (
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Website</p>
              <a href={profile.company_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-amber-400 hover:text-amber-300 hover:underline truncate block">
                {profile.company_url}
              </a>
            </div>
          )}
          {profile.revenue_run_rate != null && profile.revenue_run_rate > 0 && (
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">MRR</p>
              <p className="text-sm font-medium text-white">${profile.revenue_run_rate.toLocaleString()}</p>
            </div>
          )}
          {profile.team_size != null && profile.team_size > 0 && (
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Team</p>
              <p className="text-sm font-medium text-white">{profile.team_size} people</p>
            </div>
          )}
          {profile.runway_months != null && profile.runway_months > 0 && (
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Runway</p>
              <p className="text-sm font-medium text-white">{profile.runway_months} months</p>
            </div>
          )}
          <VentureFitBar profile={profile} />
        </div>
      )}

      {profile.role === 'founder' && (profile.competitor_gap?.length || profile.market_sentiment) && (
        <div className="mt-6 bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium px-4 py-3 border-b border-white/10">Market position</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/50 font-medium px-4 py-2 w-32"></th>
                  <th className="text-left text-white font-medium px-4 py-2">{profile.company_name || 'This startup'}</th>
                  <th className="text-left text-white/50 font-medium px-4 py-2">Market leader</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                <tr className="border-b border-white/5"><td className="px-4 py-2 text-white/40">Target audience</td><td className="px-4 py-2">{profile.focus_markets?.length ? profile.focus_markets.join(', ') : '—'}</td><td className="px-4 py-2">—</td></tr>
                <tr className="border-b border-white/5"><td className="px-4 py-2 text-white/40">Primary pricing</td><td className="px-4 py-2">—</td><td className="px-4 py-2">—</td></tr>
                <tr className="border-b border-white/5"><td className="px-4 py-2 text-white/40">Core tech</td><td className="px-4 py-2">{profile.headline || '—'}</td><td className="px-4 py-2">—</td></tr>
                <tr className="border-b border-white/5"><td className="px-4 py-2 text-white/40">Differentiators</td><td className="px-4 py-2">{profile.competitor_gap?.length ? profile.competitor_gap.join(' · ') : '—'}</td><td className="px-4 py-2">—</td></tr>
              </tbody>
            </table>
          </div>
          {profile.market_sentiment && (
            <p className="px-4 py-2 text-xs text-white/50 border-t border-white/5">Market sentiment: {profile.market_sentiment}</p>
          )}
        </div>
      )}

      {(profile.intelligence_sources?.length || profile.niche_moat || profile.financial_health) && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <button type="button" onClick={() => setLogicTraceOpen(true)} className="text-xs font-medium text-amber-400 hover:text-amber-300 hover:underline">
            How was this calculated?
          </button>
        </div>
      )}
      {logicTraceOpen && <LogicTraceModal onClose={() => setLogicTraceOpen(false)} sources={profile.intelligence_sources} />}
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
