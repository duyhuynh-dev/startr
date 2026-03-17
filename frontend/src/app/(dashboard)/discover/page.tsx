/**
 * Discovery Feed – Contra-inspired dashboard with welcome header, 
 * profile card feed, and right sidebar for stats/filters
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProfileCard } from '@/components/features/discover/ProfileCard';
import { DiligenceSidebar } from '@/components/features/diligence';
import { LocationAutocomplete, MatchModal, useToast } from '@/components/ui';
import { feedApi } from '@/lib/api/feed';
import { matchesApi } from '@/lib/api/matches';
import type { ProfileCard as ProfileCardType } from '@/lib/api/feed';
import Link from 'next/link';

const STAGE_OPTIONS = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth'];
const SECTOR_OPTIONS = ['SaaS', 'Fintech', 'AI/ML', 'Healthcare', 'Consumer', 'Climate', 'Enterprise', 'Web3', 'Deep Tech'];

export default function DiscoverPage() {
  const { user, refreshUser } = useAuth();
  const [profiles, setProfiles] = useState<ProfileCardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [dailyLimits, setDailyLimits] = useState<{
    standard_likes_remaining: number;
    roses_remaining: number;
  } | null>(null);

  const [isDiligenceOpen, setIsDiligenceOpen] = useState(false);
  const [diligenceProfileId, setDiligenceProfileId] = useState<string | null>(null);

  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState('');
  const [minCheckSize, setMinCheckSize] = useState<number | ''>('');
  const [maxCheckSize, setMaxCheckSize] = useState<number | ''>('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { toast } = useToast();
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedName, setMatchedName] = useState('');
  const [matchedAvatar, setMatchedAvatar] = useState<string | undefined>();
  const displayName = user?.email?.split('@')[0] ?? 'there';

  const loadDailyLimits = async () => {
    if (!user?.profile_id) return;
    try {
      const limits = await matchesApi.getDailyLimits();
      setDailyLimits({
        standard_likes_remaining: limits.standard_likes_remaining,
        roses_remaining: limits.roses_remaining,
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Failed to load daily limits:', err);
    }
  };

  const loadProfiles = async (overrideCursor?: string | undefined) => {
    if (!user?.profile_id) {
      setError('Please complete your profile first');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const filterParams = {
        limit: 20,
        cursor: overrideCursor !== undefined ? overrideCursor : cursor,
        ...(selectedStages.length > 0 && { stages: selectedStages }),
        ...(selectedSectors.length > 0 && { sectors: selectedSectors }),
        ...(locationFilter.trim() && { location: locationFilter.trim() }),
        ...(minCheckSize !== '' && minCheckSize != null && { min_check_size: Number(minCheckSize) }),
        ...(maxCheckSize !== '' && maxCheckSize != null && { max_check_size: Number(maxCheckSize) }),
      };
      const response = await feedApi.getDiscoveryFeed(filterParams);

      if (response.profiles.length === 0 && !response.has_more) {
        setProfiles([]);
        setHasMore(false);
        setCurrentIndex(0);
      } else {
        setProfiles(response.profiles);
        setCursor(response.cursor);
        setHasMore(response.has_more);
        setCurrentIndex(0);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load profiles';
      const res = typeof err === 'object' && err !== null && 'response' in err ? (err as { response?: { status?: number } }).response : undefined;
      const isProfileMissing = res?.status === 404 || /profile|complete your profile/i.test(msg);
      if (isProfileMissing) {
        refreshUser?.();
        setError('Please complete your profile first.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
    loadDailyLimits();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.profile_id]);

  const fetchWithFilters = useCallback(async (
    stages: string[],
    sectors: string[],
    location: string,
    minCheck?: number | '',
    maxCheck?: number | '',
  ) => {
    if (!user?.profile_id) return;
    setIsApplyingFilters(true);
    setIsLoading(true);
    setError('');
    setCursor(undefined);
    setCurrentIndex(0);

    try {
      const filterParams = {
        limit: 20,
        cursor: undefined as string | undefined,
        ...(stages.length > 0 && { stages }),
        ...(sectors.length > 0 && { sectors }),
        ...(location.trim() && { location: location.trim() }),
        ...(minCheck !== '' && minCheck != null && Number(minCheck) > 0 && { min_check_size: Number(minCheck) }),
        ...(maxCheck !== '' && maxCheck != null && Number(maxCheck) > 0 && { max_check_size: Number(maxCheck) }),
      };
      const response = await feedApi.getDiscoveryFeed(filterParams);

      if (response.profiles.length === 0 && !response.has_more) {
        setProfiles([]);
        setHasMore(false);
        setCurrentIndex(0);
      } else {
        setProfiles(response.profiles);
        setCursor(response.cursor);
        setHasMore(response.has_more);
        setCurrentIndex(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
    } finally {
      setIsLoading(false);
      setIsApplyingFilters(false);
      setFiltersOpen(false);
    }
  }, [user?.profile_id]);

  const handleApplyFilters = useCallback(() => {
    fetchWithFilters(selectedStages, selectedSectors, locationFilter, minCheckSize, maxCheckSize);
  }, [fetchWithFilters, selectedStages, selectedSectors, locationFilter, minCheckSize, maxCheckSize]);

  const handleClearFilters = useCallback(() => {
    setSelectedStages([]);
    setSelectedSectors([]);
    setLocationFilter('');
    setMinCheckSize('');
    setMaxCheckSize('');
    fetchWithFilters([], [], '', '', '');
  }, [fetchWithFilters]);

  const handleLike = async (likeType: 'standard' | 'rose' = 'standard', note?: string, promptId?: string) => {
    if (!user?.profile_id || !currentProfile || isLoading) return;
    if (dailyLimits && dailyLimits.standard_likes_remaining <= 0) return;

    const isLastProfile = currentIndex === profiles.length - 1 && !hasMore;
    setIsLoading(true);

    try {
      const response = await matchesApi.sendLike({
        sender_id: user.profile_id,
        recipient_id: currentProfile.id,
        like_type: likeType,
        note,
        prompt_id: promptId,
      });

      if (response.status === 'matched') {
        setMatchedName(currentProfile.full_name || 'Someone');
        setMatchedAvatar(currentProfile.avatar_url);
        setMatchModalOpen(true);
      }

      await loadDailyLimits();

      if (isLastProfile) {
        setProfiles((prev) => prev.filter((_, idx) => idx !== currentIndex));
      } else {
        moveToNextProfile();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send like', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePass = async () => {
    if (!user?.profile_id || !currentProfile || isLoading) return;
    const isLastProfile = currentIndex === profiles.length - 1 && !hasMore;
    setIsLoading(true);

    try {
      await matchesApi.passOnProfile({
        user_id: user.profile_id,
        passed_profile_id: currentProfile.id,
      });
    } catch {
      // still advance
    }

    if (isLastProfile) {
      setProfiles((prev) => prev.filter((_, idx) => idx !== currentIndex));
    } else {
      moveToNextProfile();
    }
    setIsLoading(false);
  };

  const moveToNextProfile = () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
      return;
    }
    if (hasMore) {
      loadProfiles();
    } else {
      setProfiles((prev) => prev.filter((_, idx) => idx !== currentIndex));
    }
  };

  const currentProfile = profiles[currentIndex];

  const handleViewDiligence = useCallback(() => {
    if (currentProfile) {
      setDiligenceProfileId(currentProfile.id);
      setIsDiligenceOpen(true);
    }
  }, [currentProfile]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Top header bar */}
        <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl px-6 lg:px-10 py-5">
          <div className="max-w-6xl">
            <h1 className="text-2xl font-semibold text-white">
              Welcome, {displayName}
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              Discover founders and investors that match your criteria.
            </p>
          </div>
        </div>

        <div className="px-6 lg:px-10 py-6">
          <div className="max-w-6xl flex gap-6 items-start">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Stats strip */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50">
                  <span className="font-semibold text-white">{profiles.length > 0 ? profiles.length - currentIndex : 0}</span> profiles
                </div>
                {dailyLimits && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50">
                    <span className="font-semibold text-white">{dailyLimits.standard_likes_remaining}</span> likes today
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    filtersOpen || selectedStages.length > 0 || selectedSectors.length > 0 || locationFilter.trim() || minCheckSize !== '' || maxCheckSize !== ''
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/5'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                  {(selectedStages.length > 0 || selectedSectors.length > 0 || locationFilter.trim() || minCheckSize !== '' || maxCheckSize !== '') && (
                    <span className="w-4 h-4 rounded-full bg-amber-400 text-[#060611] text-[10px] font-bold flex items-center justify-center">
                      {selectedStages.length + selectedSectors.length + (locationFilter.trim() ? 1 : 0) + (minCheckSize !== '' ? 1 : 0) + (maxCheckSize !== '' ? 1 : 0)}
                    </span>
                  )}
                </button>
              </div>

              {/* Filters dropdown */}
              <AnimatePresence>
                {filtersOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mb-6"
                  >
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <p className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Stage</p>
                          <div className="space-y-1.5">
                            {STAGE_OPTIONS.map((stage) => (
                              <label key={stage} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={selectedStages.includes(stage)}
                                  onChange={() => setSelectedStages((prev) =>
                                    prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
                                  )}
                                  className="w-3.5 h-3.5 rounded border-white/20 text-amber-500 focus:ring-amber-500/20"
                                />
                                <span className="text-sm text-white/50 group-hover:text-white transition-colors">{stage}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Sector</p>
                          <div className="space-y-1.5">
                            {SECTOR_OPTIONS.map((sector) => (
                              <label key={sector} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={selectedSectors.includes(sector)}
                                  onChange={() => setSelectedSectors((prev) =>
                                    prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector]
                                  )}
                                  className="w-3.5 h-3.5 rounded border-white/20 text-amber-500 focus:ring-amber-500/20"
                                />
                                <span className="text-sm text-white/50 group-hover:text-white transition-colors">{sector}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Location</p>
                          <LocationAutocomplete
                            label=""
                            value={locationFilter}
                            onChange={(val) => setLocationFilter(val)}
                            placeholder="e.g., San Francisco"
                            selectFormat="city"
                          />
                        </div>

                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Check size min ($)</p>
                            <input
                              type="number"
                              min={0}
                              step={10000}
                              placeholder="e.g. 100000"
                              value={minCheckSize === '' ? '' : minCheckSize}
                              onChange={(e) => setMinCheckSize(e.target.value === '' ? '' : Number(e.target.value) || '')}
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Check size max ($)</p>
                            <input
                              type="number"
                              min={0}
                              step={10000}
                              placeholder="e.g. 5000000"
                              value={maxCheckSize === '' ? '' : maxCheckSize}
                              onChange={(e) => setMaxCheckSize(e.target.value === '' ? '' : Number(e.target.value) || '')}
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-white/5">
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="px-4 py-2 text-sm text-white/40 hover:text-white transition-colors"
                        >
                          Clear all
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyFilters}
                          disabled={isApplyingFilters}
                          className="px-6 py-2 rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] text-sm font-semibold hover:from-amber-500 hover:to-yellow-600 transition-colors disabled:opacity-50"
                        >
                          {isApplyingFilters ? 'Applying...' : 'Apply filters'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Content */}
              {isLoading && profiles.length === 0 ? (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="w-full max-w-xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden animate-pulse">
                    <div className="h-64 bg-white/5" />
                    <div className="p-6 space-y-3">
                      <div className="h-6 w-48 bg-white/5 rounded-lg" />
                      <div className="h-4 w-72 bg-white/5 rounded-lg" />
                      <div className="flex gap-2 mt-4">
                        <div className="h-8 w-20 bg-white/5 rounded-lg" />
                        <div className="h-8 w-24 bg-white/5 rounded-lg" />
                        <div className="h-8 w-16 bg-white/5 rounded-lg" />
                      </div>
                    </div>
                    <div className="px-6 pb-5 flex gap-3">
                      <div className="h-11 flex-1 bg-white/5 rounded-xl" />
                      <div className="h-11 flex-1 bg-white/5 rounded-xl" />
                    </div>
                  </div>
                </div>
              ) : error && profiles.length === 0 ? (
                <div className="text-center py-24">
                  <p className="text-red-400 text-sm mb-3">{error}</p>
                  {!user?.profile_id ? (
                    <Link href="/onboarding" className="text-sm font-medium text-white hover:underline">
                      Complete your profile
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => loadProfiles()}
                      className="text-sm font-medium text-white hover:underline"
                    >
                      Try again
                    </button>
                  )}
                </div>
              ) : !currentProfile ? (
                <div className="text-center py-24">
                  {(selectedStages.length > 0 || selectedSectors.length > 0 || locationFilter.trim() || minCheckSize !== '' || maxCheckSize !== '') ? (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                        <svg className="w-7 h-7 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-white mb-1">No profiles match your filters</h2>
                      <p className="text-sm text-white/40 mb-1">
                        Active filters:{' '}
                        {[
                          ...selectedStages,
                          ...selectedSectors,
                          ...(locationFilter.trim() ? [locationFilter.trim()] : []),
                          ...(minCheckSize !== '' ? [`Min check $${Number(minCheckSize).toLocaleString()}`] : []),
                          ...(maxCheckSize !== '' ? [`Max check $${Number(maxCheckSize).toLocaleString()}`] : []),
                        ].join(', ')}
                      </p>
                      <p className="text-sm text-white/30 mb-4">Try broadening your search or clearing some filters.</p>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="text-sm font-medium text-white hover:underline"
                      >
                        Clear all filters
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                        <svg className="w-7 h-7 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-white mb-1">All caught up</h2>
                      <p className="text-sm text-white/40 mb-4">You&apos;ve reviewed all available profiles.</p>
                      <div className="flex items-center justify-center gap-3">
                        <Link href="/likes" className="text-sm font-medium text-white hover:underline">
                          View likes
                        </Link>
                        <span className="text-white/20">·</span>
                        <Link href="/messages" className="text-sm font-medium text-white hover:underline">
                          Messages
                        </Link>
                        <span className="text-white/20">·</span>
                        <button type="button" onClick={() => loadProfiles()} className="text-sm font-medium text-white hover:underline">
                          Refresh
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentProfile.id}
                    initial={{ opacity: 0, scale: 0.97, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, x: -60 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  >
                    <ProfileCard
                      profile={currentProfile}
                      onLike={handleLike}
                      onPass={handlePass}
                      onViewDiligence={currentProfile.role === 'founder' ? handleViewDiligence : undefined}
                      dailyLimits={dailyLimits}
                    />
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Right sidebar */}
            <div className="hidden xl:block w-72 shrink-0 space-y-4">
              {/* Action items card */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Your action items</h3>
                <div className="space-y-2.5">
                  <Link
                    href="/likes"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-white/70">Check your likes</p>
                      <p className="text-xs text-white/40">See who&apos;s interested</p>
                    </div>
                    <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
                  </Link>

                  <Link
                    href="/messages"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-white/70">Messages</p>
                      <p className="text-xs text-white/40">Chat with matches</p>
                    </div>
                    <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
                  </Link>

                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-white/70">Edit profile</p>
                      <p className="text-xs text-white/40">Update your details</p>
                    </div>
                    <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              </div>

              {/* Quick tips card */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
                <h3 className="text-sm font-semibold text-white mb-2">Getting started</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-linear-to-r from-amber-400 to-yellow-500 flex items-center justify-center text-[#060611] text-[10px] font-bold shrink-0 mt-0.5">1</div>
                    <p className="text-xs text-white/50 leading-relaxed">Browse profiles and express interest by clicking &ldquo;Interested.&rdquo;</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-linear-to-r from-amber-400 to-yellow-500 flex items-center justify-center text-[#060611] text-[10px] font-bold shrink-0 mt-0.5">2</div>
                    <p className="text-xs text-white/50 leading-relaxed">When both sides are interested, you&apos;ll match and can start messaging.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-linear-to-r from-amber-400 to-yellow-500 flex items-center justify-center text-[#060611] text-[10px] font-bold shrink-0 mt-0.5">3</div>
                    <p className="text-xs text-white/50 leading-relaxed">Complete your profile to improve match quality.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Due Diligence Sidebar */}
        {diligenceProfileId && (
          <DiligenceSidebar
            profileId={diligenceProfileId}
            profileRole="founder"
            isOpen={isDiligenceOpen}
            onClose={() => setIsDiligenceOpen(false)}
          />
        )}

        <MatchModal
          isOpen={matchModalOpen}
          matchName={matchedName}
          matchAvatar={matchedAvatar}
          onClose={() => setMatchModalOpen(false)}
        />
      </div>
    </ProtectedRoute>
  );
}
