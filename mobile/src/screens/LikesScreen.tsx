import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactMedium } from '../utils/haptics';

import apiClient from '../api/client';
import { sendLike } from '../api/matches';

interface LikesQueueItem {
  profile: {
    id: string;
    full_name: string;
    headline?: string;
    avatar_url?: string;
    location?: string;
    role: string;
  };
  like_id: string;
  note?: string;
  liked_at: string;
}

function SkeletonRow() {
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Animated.View style={[styles.avatarPlaceholder, { opacity: pulse }]} />
        <View style={styles.info}>
          <Animated.View style={{ height: 14, width: '60%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 7, opacity: pulse }} />
          <Animated.View style={{ height: 10, width: '40%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, marginTop: 6, opacity: pulse }} />
        </View>
      </View>
    </View>
  );
}

function AnimatedCard({ children, index }: { children: React.ReactNode; index: number }) {
  const slideY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4, delay: index * 60 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ translateY: slideY }], opacity }}>
      {children}
    </Animated.View>
  );
}

export function LikesScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<LikesQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchLikes = useCallback(async () => {
    try {
      setError('');
      const res = await apiClient.get<LikesQueueItem[]>('/feed/likes-queue');
      setItems(res.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    }
  }, []);

  useEffect(() => {
    (async () => { setIsLoading(true); await fetchLikes(); setIsLoading(false); })();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchLikes(); setRefreshing(false);
  }, [fetchLikes]);

  const handleLikeBack = useCallback(async (profileId: string) => {
    impactMedium();
    try {
      await sendLike({ recipient_id: profileId, like_type: 'standard' });
      setItems((prev) => prev.filter((i) => i.profile.id !== profileId));
    } catch {}
  }, []);

  const renderItem = useCallback(({ item, index }: { item: LikesQueueItem; index: number }) => {
    const p = item.profile;
    return (
      <AnimatedCard index={index}>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            {p.avatar_url ? (
              <Image source={{ uri: p.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{p.full_name?.charAt(0)?.toUpperCase() || '?'}</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{p.full_name}</Text>
              {p.headline ? <Text style={styles.headline} numberOfLines={1}>{p.headline}</Text> : null}
              {item.note ? <Text style={styles.note} numberOfLines={2}>"{item.note}"</Text> : null}
            </View>
            <TouchableOpacity style={styles.likeBackBtn} onPress={() => handleLikeBack(p.id)} activeOpacity={0.8}>
              <Ionicons name="heart" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedCard>
    );
  }, [handleLikeBack]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Likes</Text>
        {items.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{items.length}</Text></View>}
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchLikes}><Text style={styles.retryBtnText}>Retry</Text></TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={styles.list}>{[0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}</View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="heart-outline" size={56} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyTitle}>No likes yet</Text>
          <Text style={styles.emptySubtitle}>When someone likes you, they'll show up here</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.like_id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060611' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)', backgroundColor: '#0d0e1a',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  badge: { backgroundColor: '#f87171', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { fontSize: 14, color: '#f87171', marginBottom: 12 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f59e0b' },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff', marginTop: 20 },
  emptySubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.3)', marginTop: 6, textAlign: 'center' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  headline: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  note: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontStyle: 'italic' },
  likeBackBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#34d399', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#34d399', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
});
