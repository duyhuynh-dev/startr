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
import { useNavigation } from '@react-navigation/native';

import { getConversations, type ConversationThread } from '../api/messaging';

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString();
}

function SkeletonThread() {
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
    <View style={styles.threadRow}>
      <Animated.View style={[styles.avatarPlaceholder, { opacity: pulse }]} />
      <View style={styles.threadInfo}>
        <Animated.View style={{ height: 14, width: '50%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 7, opacity: pulse }} />
        <Animated.View style={{ height: 10, width: '70%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, marginTop: 8, opacity: pulse }} />
      </View>
    </View>
  );
}

function AnimatedRow({ children, index }: { children: React.ReactNode; index: number }) {
  const slideX = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideX, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4, delay: index * 50 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={{ transform: [{ translateX: slideX }], opacity }}>{children}</Animated.View>;
}

export function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchThreads = useCallback(async () => {
    try { setError(''); const data = await getConversations(); setThreads(data); } catch (e: any) { setError(e?.message || 'Failed to load'); }
  }, []);

  useEffect(() => { (async () => { setIsLoading(true); await fetchThreads(); setIsLoading(false); })(); }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchThreads(); setRefreshing(false); }, [fetchThreads]);

  const renderItem = useCallback(({ item, index }: { item: ConversationThread; index: number }) => (
    <AnimatedRow index={index}>
      <TouchableOpacity
        style={styles.threadRow}
        activeOpacity={0.6}
        onPress={() => navigation.navigate('Chat', {
          matchId: item.match_id, name: item.other_party_name,
          otherPartyId: item.other_party_id, avatarUrl: item.other_party_avatar_url,
        })}
      >
        {item.other_party_avatar_url ? (
          <Image source={{ uri: item.other_party_avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{item.other_party_name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
        )}
        <View style={styles.threadInfo}>
          <View style={styles.threadTopRow}>
            <Text style={[styles.threadName, item.unread_count > 0 && styles.threadNameUnread]} numberOfLines={1}>{item.other_party_name}</Text>
            <Text style={styles.threadTime}>{timeAgo(item.last_message_at)}</Text>
          </View>
          {item.last_message_preview ? (
            <Text style={[styles.threadPreview, item.unread_count > 0 && styles.threadPreviewUnread]} numberOfLines={1}>{item.last_message_preview}</Text>
          ) : (
            <Text style={styles.threadPreviewEmpty}>Say hello!</Text>
          )}
        </View>
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unread_count}</Text></View>
        )}
      </TouchableOpacity>
    </AnimatedRow>
  ), [navigation]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.headerTitle}>Messages</Text></View>

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchThreads}><Text style={styles.retryBtnText}>Retry</Text></TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View>{[0, 1, 2, 3, 4].map((i) => <SkeletonThread key={i} />)}</View>
      ) : threads.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={56} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>Match with someone to start chatting</Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.match_id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060611' },
  header: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)', backgroundColor: '#0d0e1a',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { fontSize: 14, color: '#f87171', marginBottom: 12 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f59e0b' },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff', marginTop: 20 },
  emptySubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.3)', marginTop: 6, textAlign: 'center' },
  threadRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#0d0e1a',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 14,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  threadInfo: { flex: 1 },
  threadTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  threadName: { fontSize: 16, fontWeight: '500', color: '#ffffff', flex: 1 },
  threadNameUnread: { fontWeight: '700' },
  threadTime: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 8 },
  threadPreview: { fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 3 },
  threadPreviewUnread: { color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  threadPreviewEmpty: { fontSize: 14, color: 'rgba(255,255,255,0.15)', marginTop: 3, fontStyle: 'italic' },
  unreadBadge: {
    backgroundColor: '#34d399', minWidth: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  unreadText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
