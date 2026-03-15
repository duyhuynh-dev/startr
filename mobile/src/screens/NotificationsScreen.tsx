import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from '../api/notifications';
import { useWS } from '../context/WebSocketContext';

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diffMs / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diffMs / 86400000);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function iconForKind(kind: string): keyof typeof Ionicons.glyphMap {
  if (kind === 'new_match') return 'heart';
  if (kind === 'new_message') return 'chatbubble';
  if (kind === 'new_like') return 'star';
  return 'notifications';
}

export function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { setUnreadNotifications } = useWS();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const data = await getNotifications();
      setItems(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await fetch(); setLoading(false); })();
  }, [fetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetch(); setRefreshing(false);
  }, [fetch]);

  const handleTap = useCallback(async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await markNotificationRead(item.id);
        setItems((prev) => prev.map((n) => n.id === item.id ? { ...n, is_read: true } : n));
        setUnreadNotifications((n: number) => Math.max(0, n - 1));
      } catch {}
    }
  }, [setUnreadNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadNotifications(0);
    } catch {}
  }, [setUnreadNotifications]);

  const renderItem = useCallback(({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.row, !item.is_read && styles.rowUnread]}
      onPress={() => handleTap(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, !item.is_read && styles.iconWrapUnread]}>
        <Ionicons name={iconForKind(item.kind)} size={18} color={!item.is_read ? '#fbbf24' : 'rgba(255,255,255,0.3)'} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, !item.is_read && styles.rowTitleUnread]}>{item.title}</Text>
        <Text style={styles.rowBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.rowTime}>{timeAgo(item.created_at)}</Text>
      </View>
      {!item.is_read && <View style={styles.dot} />}
    </TouchableOpacity>
  ), [handleTap]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {Array.isArray(items) && items.length > 0 && items.some((n) => !n.is_read) && (
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#fbbf24" /></View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-outline" size={56} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySubtitle}>You're all caught up</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.id ?? 'notif'}-${index}`}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)', backgroundColor: '#0d0e1a',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff' },
  markAll: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff', marginTop: 20 },
  emptySubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.3)', marginTop: 6 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#0d0e1a',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowUnread: { backgroundColor: 'rgba(251,191,36,0.08)' },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center',
  },
  iconWrapUnread: { backgroundColor: 'rgba(251,191,36,0.15)' },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  rowTitleUnread: { fontWeight: '700', color: '#ffffff' },
  rowBody: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  rowTime: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fbbf24', marginTop: 6 },
});
