import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactLight, impactMedium, notifySuccess } from '../utils/haptics';

import { getDiscoveryFeed, type ProfileCard } from '../api/feed';
import { sendLike, passOnProfile, type LikeResponse } from '../api/matches';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_H * 0.45;
const SWIPE_THRESHOLD = SCREEN_W * 0.25;

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

function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <View style={styles.skeletonWrap}>
      <Animated.View style={[styles.skeletonHero, { opacity: pulse }]} />
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonLine, { width: '60%', opacity: pulse }]} />
        <Animated.View style={[styles.skeletonLine, { width: '40%', opacity: pulse }]} />
        <Animated.View style={[styles.skeletonBlock, { opacity: pulse }]} />
      </View>
    </View>
  );
}

const STAGE_OPTIONS = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth'];
const SECTOR_OPTIONS = ['SaaS', 'Fintech', 'AI/ML', 'Healthcare', 'Consumer', 'Climate', 'Enterprise', 'Web3', 'Deep Tech'];

export function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [matchBanner, setMatchBanner] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState('');

  // Swipe animation
  const swipeX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const nextCardScale = useRef(new Animated.Value(0.95)).current;
  const matchScale = useRef(new Animated.Value(0)).current;
  const overlayOpacity = swipeX.interpolate({
    inputRange: [-SCREEN_W, 0, SCREEN_W],
    outputRange: [1, 0, 1],
    extrapolate: 'clamp',
  });
  const overlayColor = swipeX.interpolate({
    inputRange: [-SCREEN_W, 0, SCREEN_W],
    outputRange: ['rgba(239,68,68,0.3)', 'rgba(0,0,0,0)', 'rgba(16,185,129,0.3)'],
    extrapolate: 'clamp',
  });

  const fetchProfiles = useCallback(
    async (reset = false, overrides?: { stages?: string[]; sectors?: string[]; location?: string }) => {
      try {
        setError('');
        const stages = overrides?.stages ?? selectedStages;
        const sectors = overrides?.sectors ?? selectedSectors;
        const loc = overrides?.location ?? locationFilter;
        const res = await getDiscoveryFeed({
          limit: 10,
          cursor: reset ? undefined : cursor,
          stages: stages.length ? stages : undefined,
          sectors: sectors.length ? sectors : undefined,
          location: (loc || '').trim() || undefined,
        });
        if (reset) {
          setProfiles(res.profiles);
          setCurrentIdx(0);
        } else {
          setProfiles((prev) => [...prev, ...res.profiles]);
        }
        setCursor(res.cursor);
        setHasMore(res.has_more);
      } catch (e: any) {
        setError(e?.message || 'Failed to load profiles');
      }
    },
    [cursor, selectedStages, selectedSectors, locationFilter],
  );

  useEffect(() => {
    (async () => { setIsLoading(true); await fetchProfiles(true); setIsLoading(false); })();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchProfiles(true); setRefreshing(false);
  }, [fetchProfiles]);

  const animateOut = useCallback((direction: 'left' | 'right', onDone: () => void) => {
    const toValue = direction === 'right' ? SCREEN_W * 1.5 : -SCREEN_W * 1.5;
    Animated.parallel([
      Animated.spring(swipeX, { toValue, useNativeDriver: true, speed: 20, bounciness: 0 }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.spring(nextCardScale, { toValue: 1, useNativeDriver: true, speed: 12 }),
    ]).start(() => {
      swipeX.setValue(0);
      cardOpacity.setValue(1);
      nextCardScale.setValue(0.95);
      onDone();
    });
  }, [swipeX, cardOpacity, nextCardScale]);

  const advanceCard = useCallback(() => {
    setCurrentIdx((prev) => {
      const next = prev + 1;
      if (next >= profiles.length - 2 && hasMore) fetchProfiles(false);
      return next;
    });
  }, [profiles.length, hasMore, fetchProfiles]);

  const handleLike = useCallback(async () => {
    const profile = profiles[currentIdx];
    if (!profile || actionLoading) return;
    setActionLoading(true);
    impactMedium();
    try {
      const res: LikeResponse = await sendLike({ recipient_id: profile.id, like_type: 'standard' });
      animateOut('right', () => {
        if (res.status === 'matched') {
          setMatchBanner(profile.full_name);
          notifySuccess();
          Animated.spring(matchScale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 12 }).start();
          setTimeout(() => {
            Animated.timing(matchScale, { toValue: 0, duration: 300, useNativeDriver: true }).start();
            setMatchBanner(null);
          }, 3000);
        }
        advanceCard();
      });
    } catch {} finally { setActionLoading(false); }
  }, [profiles, currentIdx, actionLoading, advanceCard, animateOut, matchScale]);

  const handlePass = useCallback(async () => {
    const profile = profiles[currentIdx];
    if (!profile || actionLoading) return;
    setActionLoading(true);
    impactLight();
    try {
      await passOnProfile({ passed_profile_id: profile.id });
      animateOut('left', advanceCard);
    } catch {} finally { setActionLoading(false); }
  }, [profiles, currentIdx, actionLoading, advanceCard, animateOut]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => { swipeX.setValue(gs.dx); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD) {
          handleLike();
        } else if (gs.dx < -SWIPE_THRESHOLD) {
          handlePass();
        } else {
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, speed: 20 }).start();
        }
      },
    }),
  ).current;

  const profile = profiles[currentIdx];
  const nextProfile = profiles[currentIdx + 1];
  const isEmpty = !isLoading && !error && (!profile || currentIdx >= profiles.length);
  const activeFilterCount =
    selectedStages.length +
    selectedSectors.length +
    (locationFilter.trim() ? 1 : 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top bar with filters */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Discover</Text>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            activeFilterCount > 0 && styles.filterBtnActive,
          ]}
          onPress={() => setFiltersOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={18} color="#fbbf24" />
          <Text style={styles.filterLabel}>
            Filters{activeFilterCount ? ` · ${activeFilterCount}` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Match celebration overlay */}
      {matchBanner && (
        <View style={styles.matchOverlay}>
          <Animated.View style={[styles.matchContent, { transform: [{ scale: matchScale }] }]}>
            <Text style={styles.matchEmoji}>🎉</Text>
            <Text style={styles.matchTitle}>It's a Match!</Text>
            <Text style={styles.matchSubtitle}>You and {matchBanner} liked each other</Text>
          </Animated.View>
        </View>
      )}

      {error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={56} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchProfiles(true)}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <SkeletonCard />
      ) : isEmpty ? (
        <View style={styles.centered}>
          <Ionicons name="sparkles-outline" size={56} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyTitle}>You've seen everyone</Text>
          <Text style={styles.emptySubtitle}>Check back later for new profiles</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : profile ? (
        <View style={styles.cardWrapper}>
          {/* Next card preview (behind current) */}
          {nextProfile && (
            <Animated.View style={[styles.nextCard, { transform: [{ scale: nextCardScale }] }]}>
              <View style={styles.heroSection}>
                {nextProfile.avatar_url ? (
                  <Image source={{ uri: nextProfile.avatar_url }} style={styles.heroImage} resizeMode="cover" />
                ) : (
                  <View style={styles.heroPlaceholder}>
                    <Text style={styles.heroInitial}>{nextProfile.full_name?.charAt(0)?.toUpperCase() || '?'}</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* Swipeable current card */}
          <Animated.View
            style={[styles.currentCard, {
              transform: [
                { translateX: swipeX },
                { rotate: swipeX.interpolate({ inputRange: [-SCREEN_W, 0, SCREEN_W], outputRange: ['-8deg', '0deg', '8deg'] }) },
              ],
              opacity: cardOpacity,
            }]}
            {...panResponder.panHandlers}
          >
            {/* Swipe overlay tint */}
            <Animated.View style={[styles.swipeOverlay, { backgroundColor: overlayColor, opacity: overlayOpacity }]} />

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              <View style={styles.heroSection}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.heroImage} resizeMode="cover" />
                ) : (
                  <View style={styles.heroPlaceholder}>
                    <Text style={styles.heroInitial}>{profile.full_name?.charAt(0)?.toUpperCase() || '?'}</Text>
                  </View>
                )}
                <View style={styles.heroGradient} />
                <View style={styles.heroOverlay}>
                  <View style={styles.heroNameRow}>
                    <Text style={styles.heroName}>{profile.full_name}</Text>
                    {profile.is_online && <View style={styles.onlineDot} />}
                  </View>
                  {profile.headline ? <Text style={styles.heroHeadline} numberOfLines={2}>{profile.headline}</Text> : null}
                  <View style={styles.heroMeta}>
                    {profile.location ? (
                      <View style={styles.metaChip}><Ionicons name="location-outline" size={13} color="#fff" /><Text style={styles.metaChipText}>{profile.location}</Text></View>
                    ) : null}
                    <View style={styles.metaChip}>
                      <Ionicons name={profile.role === 'investor' ? 'briefcase-outline' : 'rocket-outline'} size={13} color="#fff" />
                      <Text style={styles.metaChipText}>{profile.role === 'investor' ? 'Investor' : 'Founder'}</Text>
                    </View>
                    {(profile.is_online || profile.last_active_at) && (
                      <View style={styles.metaChip}>
                        <View style={[styles.metaDot, { backgroundColor: profile.is_online ? '#34d399' : '#9ca3af' }]} />
                        <Text style={styles.metaChipText}>{profile.is_online ? 'Online' : `Active ${formatLastActive(profile.last_active_at!)}`}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {profile.compatibility_score != null && profile.compatibility_score > 0 && (
                  <View style={styles.compatBadge}>
                    <Text style={styles.compatValue}>{Math.round(profile.compatibility_score)}%</Text>
                    <Text style={styles.compatLabel}>match</Text>
                  </View>
                )}
              </View>

              <View style={styles.contentArea}>
                {profile.prompts?.length > 0 && profile.prompts.map((p, idx) => (
                  <View key={p.prompt_id || idx} style={styles.promptCard}>
                    <Text style={styles.promptText}>{p.content}</Text>
                  </View>
                ))}
                {profile.role === 'investor' && <InvestorSection profile={profile} />}
                {profile.role === 'founder' && <FounderSection profile={profile} />}
              </View>
            </ScrollView>
          </Animated.View>

          {/* Bottom action bar */}
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 6 }]}>
            <TouchableOpacity style={styles.passBtn} onPress={handlePass} disabled={actionLoading} activeOpacity={0.8}>
              <Ionicons name="close" size={24} color="#f87171" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.likeBtn} onPress={handleLike} disabled={actionLoading} activeOpacity={0.8}>
              <Ionicons name="heart" size={22} color="#060611" />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Filters panel */}
      <Modal
        visible={filtersOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersOpen(false)}
      >
        <View style={styles.filtersOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setFiltersOpen(false)}
          />
          <View style={[styles.filtersSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.filtersHeader}>
              <Text style={styles.filtersTitle}>Refine matches</Text>
              <TouchableOpacity onPress={() => setFiltersOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.filterSectionLabel}>Stage</Text>
              <View style={styles.filterChipRow}>
                {STAGE_OPTIONS.map((stage) => {
                  const active = selectedStages.includes(stage);
                  return (
                    <TouchableOpacity
                      key={stage}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() =>
                        setSelectedStages((prev) =>
                          prev.includes(stage)
                            ? prev.filter((s) => s !== stage)
                            : [...prev, stage],
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {stage}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterSectionLabel}>Sector</Text>
              <View style={styles.filterChipRow}>
                {SECTOR_OPTIONS.map((sector) => {
                  const active = selectedSectors.includes(sector);
                  return (
                    <TouchableOpacity
                      key={sector}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() =>
                        setSelectedSectors((prev) =>
                          prev.includes(sector)
                            ? prev.filter((s) => s !== sector)
                            : [...prev, sector],
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {sector}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterSectionLabel}>Location</Text>
              <View style={styles.locationInputWrap}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color="rgba(255,255,255,0.4)"
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={[styles.locationTextInput, !locationFilter && styles.locationInputPlaceholder]}
                  value={locationFilter}
                  onChangeText={setLocationFilter}
                  placeholder="e.g., San Francisco"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
              </View>
            </ScrollView>

            <View style={styles.filtersFooter}>
              <TouchableOpacity
                style={styles.clearFiltersBtn}
                onPress={() => {
                  setSelectedStages([]);
                  setSelectedSectors([]);
                  setLocationFilter('');
                  setFiltersOpen(false);
                  fetchProfiles(true, { stages: [], sectors: [], location: '' });
                }}
              >
                <Text style={styles.clearFiltersText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFiltersBtn}
                onPress={async () => {
                  await fetchProfiles(true);
                  setFiltersOpen(false);
                }}
              >
                <Text style={styles.applyFiltersText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InvestorSection({ profile }: { profile: ProfileCard }) {
  const hasTiles = profile.firm || (profile.check_size_min && profile.check_size_max) || profile.focus_sectors?.length || profile.focus_stages?.length;
  if (!hasTiles) return null;
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.tilesGrid}>
        {profile.firm ? <Tile label="Firm" value={profile.firm} /> : null}
        {profile.check_size_min && profile.check_size_max ? <Tile label="Check size" value={`$${(profile.check_size_min / 1000).toFixed(0)}k – $${(profile.check_size_max / 1000).toFixed(0)}k`} /> : null}
      </View>
      {profile.focus_sectors?.length ? <TagsRow label="Sectors" tags={profile.focus_sectors} /> : null}
      {profile.focus_stages?.length ? <TagsRow label="Stages" tags={profile.focus_stages} /> : null}
    </View>
  );
}

function FounderSection({ profile }: { profile: ProfileCard }) {
  const hasTiles = profile.company_name || (profile.revenue_run_rate != null && profile.revenue_run_rate > 0) || (profile.team_size != null && profile.team_size > 0) || (profile.runway_months != null && profile.runway_months > 0);
  if (!hasTiles) return null;
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.tilesGrid}>
        {profile.company_name ? <Tile label="Company" value={profile.company_name} /> : null}
        {profile.revenue_run_rate != null && profile.revenue_run_rate > 0 ? <Tile label="MRR" value={`$${profile.revenue_run_rate.toLocaleString()}`} /> : null}
        {profile.team_size != null && profile.team_size > 0 ? <Tile label="Team" value={`${profile.team_size} people`} /> : null}
        {profile.runway_months != null && profile.runway_months > 0 ? <Tile label="Runway" value={`${profile.runway_months} months`} /> : null}
      </View>
    </View>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (<View style={styles.tile}><Text style={styles.tileLabel}>{label}</Text><Text style={styles.tileValue}>{value}</Text></View>);
}

function TagsRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <View style={styles.tagsSection}>
      <Text style={styles.tileLabel}>{label}</Text>
      <View style={styles.tagsWrap}>{tags.map((t) => (<View key={t} style={styles.tagChip}><Text style={styles.tagChipText}>{t}</Text></View>))}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060611' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  topTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    gap: 6,
  },
  filterBtnActive: {
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  filterLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  // Skeleton
  skeletonWrap: { flex: 1 },
  skeletonHero: { width: SCREEN_W, height: HERO_HEIGHT, backgroundColor: 'rgba(255,255,255,0.1)' },
  skeletonContent: { padding: 20, gap: 12 },
  skeletonLine: { height: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  skeletonBlock: { height: 80, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 8 },

  // Match overlay
  matchOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 200,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  matchContent: { alignItems: 'center' },
  matchEmoji: { fontSize: 64, marginBottom: 12 },
  matchTitle: { fontSize: 32, fontWeight: '800', color: '#fff' },
  matchSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 8 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff', marginTop: 20 },
  emptySubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.3)', marginTop: 6, textAlign: 'center' },
  retryBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 50, backgroundColor: '#f59e0b' },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  cardWrapper: { flex: 1 },
  nextCard: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  currentCard: { flex: 1, zIndex: 1, backgroundColor: '#060611' },
  swipeOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, pointerEvents: 'none', borderRadius: 0 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  heroSection: { width: SCREEN_W, height: HERO_HEIGHT, backgroundColor: 'rgba(255,255,255,0.1)', position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroInitial: { fontSize: 72, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  heroGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: HERO_HEIGHT * 0.5, backgroundColor: 'rgba(0,0,0,0.4)' },
  heroOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroName: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  onlineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#34d399', borderWidth: 2, borderColor: '#ffffff' },
  heroHeadline: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  metaChipText: { fontSize: 13, color: '#ffffff', fontWeight: '500' },
  metaDot: { width: 7, height: 7, borderRadius: 4 },
  compatBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, alignItems: 'center' },
  compatValue: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  compatLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },

  contentArea: { padding: 16, gap: 14 },
  promptCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, paddingHorizontal: 20, paddingVertical: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  promptText: { fontSize: 16, color: '#ffffff', lineHeight: 24 },
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, minWidth: (SCREEN_W - 74) / 2, flexGrow: 1 },
  tileLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.3)', marginBottom: 4 },
  tileValue: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  tagsSection: { marginTop: 12 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  tagChipText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  bottomBar: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#060611',
  },
  passBtn: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.8)',
  },
  likeBtn: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
  },

  filtersOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
    elevation: 1000,
  },
  filtersSheet: {
    backgroundColor: '#0d0e1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: SCREEN_H * 0.7,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filtersTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 8,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  filterChipActive: {
    borderColor: 'rgba(251,191,36,0.6)',
    backgroundColor: 'rgba(251,191,36,0.18)',
  },
  filterChipText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  filterChipTextActive: { color: '#fbbf24', fontWeight: '600' },
  locationInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  locationTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  locationInputPlaceholder: {
    color: 'rgba(255,255,255,0.4)',
  },
  filtersFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  clearFiltersBtn: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFiltersText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  applyFiltersBtn: {
    flex: 1,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFiltersText: { fontSize: 14, fontWeight: '600', color: '#060611' },
});
