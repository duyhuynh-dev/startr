/**
 * Discovery Feed - Browse and match with profiles
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProfileCard } from '@/components/features/discover/ProfileCard';
import { Button, LoadingSpinner, Input, Checkbox, LocationAutocomplete } from '@/components/ui';
import { feedApi } from '@/lib/api/feed';
import { matchesApi } from '@/lib/api/matches';
import type { ProfileCard as ProfileCardType } from '@/lib/api/feed';
import { slideLeft, slideRight, scaleIn } from '@/lib/animations';

const STAGE_OPTIONS = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth'];
const SECTOR_OPTIONS = ['SaaS', 'Fintech', 'Climate', 'Healthcare', 'Consumer', 'Deep Tech'];

export default function DiscoverPage() {
  const { user } = useAuth();
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

  // Feed filters
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState('');
  const [minCheckSize, setMinCheckSize] = useState<string>('');
  const [maxCheckSize, setMaxCheckSize] = useState<string>('');

  const loadDailyLimits = async () => {
    if (!user?.profile_id) return;
    try {
      const limits = await matchesApi.getDailyLimits(user.profile_id);
      setDailyLimits({
        standard_likes_remaining: limits.standard_likes_remaining,
        roses_remaining: limits.roses_remaining,
      });
    } catch (err) {
      console.error('Failed to load daily limits:', err);
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
        profile_id: user.profile_id,
        limit: 20,
        cursor: overrideCursor !== undefined ? overrideCursor : cursor,
        ...(selectedStages.length > 0 && { stages: selectedStages }),
        ...(selectedSectors.length > 0 && { sectors: selectedSectors }),
        ...(locationFilter.trim() && { location: locationFilter.trim() }),
        ...(minCheckSize.trim() !== '' && { min_check_size: Number.parseInt(minCheckSize, 10) || undefined }),
        ...(maxCheckSize.trim() !== '' && { max_check_size: Number.parseInt(maxCheckSize, 10) || undefined }),
      };
      
      const response = await feedApi.getDiscoveryFeed(filterParams);

      // If we got empty results and no more, clear profiles to show "All Caught Up!"
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
    }
  };

  useEffect(() => {
    loadProfiles();
    loadDailyLimits();
  }, [user?.profile_id]);

  const handleApplyFilters = useCallback(async () => {
    // Reset pagination first
    setIsApplyingFilters(true);
    setCursor(undefined);
    setCurrentIndex(0);
    
    // Wait a moment to ensure state is settled, then reload with current filter values
    await new Promise((resolve) => setTimeout(resolve, 10));
    
    if (!user?.profile_id) {
      setError('Please complete your profile first');
      setIsApplyingFilters(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Explicitly use current filter state values
      const filterParams = {
        profile_id: user.profile_id,
        limit: 20,
        cursor: undefined, // Reset to beginning when applying filters
        ...(selectedStages.length > 0 && { stages: selectedStages }),
        ...(selectedSectors.length > 0 && { sectors: selectedSectors }),
        ...(locationFilter.trim() && { location: locationFilter.trim() }),
        ...(minCheckSize.trim() !== '' && { min_check_size: Number.parseInt(minCheckSize, 10) || undefined }),
        ...(maxCheckSize.trim() !== '' && { max_check_size: Number.parseInt(maxCheckSize, 10) || undefined }),
      };
      
      console.log('Applying filters:', filterParams);
      
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
    }
  }, [user?.profile_id, selectedStages, selectedSectors, locationFilter, minCheckSize, maxCheckSize]);

  const toggleStage = useCallback((stage: string) => {
    setSelectedStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage],
    );
  }, []);

  const toggleSector = useCallback((sector: string) => {
    setSelectedSectors((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector],
    );
  }, []);

  const handleLike = async (likeType: 'standard' | 'rose' = 'standard', note?: string, promptId?: string) => {
    if (!user?.profile_id || !currentProfile || isLoading) return;

    // Check if user has likes remaining
    if (dailyLimits && dailyLimits.standard_likes_remaining <= 0) {
      alert('You\'ve used all your likes for today! Come back tomorrow.');
      return;
    }

    // Check if this is the last profile
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
        // Match created! Show success and suggest checking Likes/Messages
        alert('It\'s a match! 🎉\n\nYou can now message them in the Messages or Likes page.');
        // Optionally redirect to messages after a short delay
        // setTimeout(() => router.push('/messages'), 2000);
      }

      // Reload daily limits
      await loadDailyLimits();

      // If this is the last profile, remove it to show "All Caught Up!"
      if (isLastProfile) {
        setProfiles((prev) => prev.filter((_, idx) => idx !== currentIndex));
        setIsLoading(false);
      } else {
        // Move to next profile (which will handle loading more if needed)
        moveToNextProfile();
        setIsLoading(false);
      }
    } catch (err) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send like';
      alert(errorMessage);
      console.error('Failed to like:', err);
    }
  };

  const handlePass = async () => {
    if (!user?.profile_id || !currentProfile || isLoading) return;

    // Check if this is the last profile
    const isLastProfile = currentIndex === profiles.length - 1 && !hasMore;

    setIsLoading(true);

    try {
      // Call backend to record pass (prevents showing again for 30 days)
      await matchesApi.passOnProfile({
        user_id: user.profile_id,
        passed_profile_id: currentProfile.id,
      });

      // If this is the last profile, remove it to show "All Caught Up!"
      if (isLastProfile) {
        setProfiles((prev) => prev.filter((_, idx) => idx !== currentIndex));
        setIsLoading(false);
      } else {
        // Move to next profile (which will handle loading more if needed)
        moveToNextProfile();
        setIsLoading(false);
      }
    } catch (err) {
      setIsLoading(false);
      console.error('Failed to pass:', err);
      // Still move to next even if pass API fails
      if (isLastProfile) {
        setProfiles((prev) => prev.filter((_, idx) => idx !== currentIndex));
      } else {
        moveToNextProfile();
      }
    }
  };

  const moveToNextProfile = () => {
    // If we're not at the last profile, just move to next
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
      return;
    }
    
    // We're at the last profile - check if there's more to load
    if (hasMore) {
      // Try to load more profiles
      loadProfiles();
    } else {
      // No more profiles - we'll automatically show "All Caught Up!" when currentProfile becomes undefined
      // Remove the current profile from the list so currentProfile becomes undefined
      setProfiles((prev) => prev.filter((_, idx) => idx !== currentIndex));
    }
  };

  const currentProfile = profiles[currentIndex];

  // Memoize filter sidebar to prevent flickering - MUST be before early returns
  const filterSidebar = useMemo(
    () => (
      <motion.div
        className="mb-8 lg:mb-0 lg:w-72"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <motion.div
          className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Filters</h2>
          <p className="text-xs text-slate-100 mb-4">
            Refine your feed by stage, sector, geography, and check size.
          </p>

          {/* Stages */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wide mb-2">
              Stages
            </h3>
            <div className="space-y-1">
              {STAGE_OPTIONS.map((stage) => (
                <Checkbox
                  key={stage}
                  label={stage}
                  checked={selectedStages.includes(stage)}
                  onChange={() => toggleStage(stage)}
                />
              ))}
            </div>
          </div>

          {/* Sectors */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wide mb-2">
              Sectors
            </h3>
            <div className="space-y-1">
              {SECTOR_OPTIONS.map((sector) => (
                <Checkbox
                  key={sector}
                  label={sector}
                  checked={selectedSectors.includes(sector)}
                  onChange={() => toggleSector(sector)}
                />
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="mb-4">
            <LocationAutocomplete
              label="Location"
              placeholder="Start typing a location (e.g., San Francisco)..."
              value={locationFilter}
              onChange={(value) => setLocationFilter(value)}
            />
          </div>

          {/* Check size */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wide mb-2">
              Check size (USD)
            </h3>
            <div className="flex gap-2">
              <Input
                placeholder="Min"
                type="number"
                value={minCheckSize}
                onChange={(e) => setMinCheckSize(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Max"
                type="number"
                value={maxCheckSize}
                onChange={(e) => setMaxCheckSize(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            className="w-full"
            onClick={handleApplyFilters}
            disabled={isApplyingFilters}
          >
            {isApplyingFilters ? 'Applying...' : 'Apply filters'}
          </Button>
        </motion.div>
      </motion.div>
    ),
    [selectedStages, selectedSectors, locationFilter, minCheckSize, maxCheckSize, isApplyingFilters, toggleStage, toggleSector, handleApplyFilters],
  );

  if (isLoading && profiles.length === 0) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </ProtectedRoute>
    );
  }

  if (error && profiles.length === 0) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto px-4">
            <p className="text-red-600 mb-4">{error}</p>
            {!user?.profile_id && (
              <p className="text-slate-100 mb-4">
                You need to complete your profile first. <a href="/onboarding" className="text-blue-600 underline">Go to onboarding</a>
              </p>
            )}
            {user?.profile_id && (
              <Button onClick={() => loadProfiles()}>Retry</Button>
            )}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!currentProfile) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
          <motion.div
            className="text-center max-w-md mx-auto px-4"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
          >
            <motion.h2
              className="text-2xl font-bold text-slate-100 mb-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0, duration: 0.15 }}
            >
              All Caught Up! 🎉
            </motion.h2>
            <motion.p
              className="text-slate-100 text-lg mb-2"
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.15 }}
            >
              You've seen all available profiles
            </motion.p>
            <motion.p
              className="text-slate-100 text-sm mb-6"
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.15 }}
            >
              Check your <a href="/likes" className="text-blue-600 hover:underline">Likes</a> or <a href="/messages" className="text-blue-600 hover:underline">Messages</a> to see your matches!
            </motion.p>
            <motion.div
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.15 }}
            >
              <Button onClick={() => loadProfiles()} variant="primary">Refresh Feed</Button>
            </motion.div>
          </motion.div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-900 py-8 px-4 pb-24">
        <div className="max-w-5xl mx-auto lg:flex lg:gap-8">
          {/* Sidebar filters - Memoized to prevent flickering */}
          {filterSidebar}

          {/* Main content */}
          <div className="flex-1">
            <div className="mb-4 text-center">
              <h1 className="text-2xl font-bold text-slate-100">Discover</h1>
              <div className="flex items-center justify-center gap-4 text-sm text-slate-100">
                <span>{profiles.length - currentIndex} profiles remaining</span>
                {dailyLimits && (
                  <>
                    <span>•</span>
                    <span>{dailyLimits.standard_likes_remaining} likes remaining today</span>
                  </>
                )}
              </div>
            </div>

            {isLoading && currentIndex === profiles.length - 1 ? (
              <motion.div
                className="flex items-center justify-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <LoadingSpinner size="lg" />
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentProfile.id}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={slideLeft}
                >
                  <ProfileCard
                    profile={currentProfile}
                    onLike={handleLike}
                    onPass={handlePass}
                    dailyLimits={dailyLimits}
                  />
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Fixed Action Buttons - Completely separate from card content to prevent layout shift */}
        <AnimatePresence>
          {currentProfile && (
            <motion.div
              className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 px-4 py-4 z-10 shadow-lg"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="max-w-5xl mx-auto">
                <div className="max-w-2xl mx-auto flex gap-4">
                  <Button
                    variant="outline"
                    onClick={handlePass}
                    disabled={isLoading}
                    className="flex-1 h-12 text-base font-semibold"
                  >
                    Pass
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleLike('standard')}
                    disabled={isLoading || (dailyLimits?.standard_likes_remaining ?? 0) <= 0}
                    className="flex-1 h-12 text-base font-semibold"
                  >
                    Interested
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}

