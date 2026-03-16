import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { impactLight } from '../utils/haptics';

import { getMessages, sendMessage, type Message } from '../api/messaging';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWS } from '../context/WebSocketContext';

type ChatRouteParams = {
  Chat: {
    matchId: string;
    name: string;
    otherPartyId: string;
    avatarUrl?: string;
  };
};

interface ProfileData {
  id: string;
  full_name: string;
  headline?: string;
  avatar_url?: string;
  location?: string;
  role: string;
  firm?: string;
  company_name?: string;
}

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ChatRouteParams, 'Chat'>>();
  const { matchId, name, otherPartyId, avatarUrl } = route.params;
  const { user } = useAuth();
  const { onNewMessage, sendTyping, sendMarkRead } = useWS();
  const myProfileId = user?.profile_id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentIds = useRef(new Set<string>());

  // Fetch messages once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const data = await getMessages(matchId);
        if (!cancelled) {
          const sorted = [...data].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );
          setMessages(sorted);
        }
      } catch {}
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [matchId]);

  // Listen for incoming WebSocket messages from the OTHER person only
  useEffect(() => {
    const unsub = onNewMessage(matchId, (msg: Message) => {
      // Skip our own messages — we already added them in handleSend
      if (msg.sender_id === myProfileId) return;
      // Skip if we already have this message by ID
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      sendMarkRead(msg.id);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [matchId, onNewMessage, sendMarkRead, myProfileId]);

  const handleTextChange = useCallback((val: string) => {
    setText(val);
    sendTyping(matchId, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => sendTyping(matchId, false), 2000);
  }, [matchId, sendTyping]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    impactLight();
    try {
      const msg = await sendMessage({ match_id: matchId, content: trimmed });
      sentIds.current.add(msg.id);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      sendTyping(matchId, false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setText(trimmed);
    }
    setSending(false);
  }, [text, sending, matchId, sendTyping]);

  const openProfile = useCallback(async () => {
    if (profileData) { setShowProfile(true); return; }
    setProfileLoading(true);
    try {
      const res = await apiClient.get<ProfileData>(`/profiles/${otherPartyId}`);
      setProfileData(res.data);
      setShowProfile(true);
    } catch {}
    setProfileLoading(false);
  }, [otherPartyId, profileData]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isMe = item.sender_id === myProfileId;
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
          {item.content}
        </Text>
        <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }, [myProfileId]);

  if (showProfile && profileData) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={() => setShowProfile(false)} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
          <Text style={styles.profileHeaderTitle}>Profile</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.profileContent}>
          {profileData.avatar_url ? (
            <Image source={{ uri: profileData.avatar_url }} style={styles.profileAvatar} />
          ) : (
            <View style={styles.profileAvatarPlaceholder}>
              <Text style={styles.profileAvatarInitial}>
                {profileData.full_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text style={styles.profileName}>{profileData.full_name}</Text>
          {profileData.headline && (
            <Text style={styles.profileHeadline}>{profileData.headline}</Text>
          )}
          <View style={styles.profileMeta}>
            {profileData.location && (
              <View style={styles.profileChip}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.4)" />
                <Text style={styles.profileChipText}>{profileData.location}</Text>
              </View>
            )}
            <View style={styles.profileChip}>
              <Ionicons
                name={profileData.role === 'investor' ? 'briefcase-outline' : 'rocket-outline'}
                size={14}
                color="rgba(255,255,255,0.4)"
              />
              <Text style={styles.profileChipText}>
                {profileData.role === 'investor' ? 'Investor' : 'Founder'}
              </Text>
            </View>
          </View>
          {profileData.firm && (
            <View style={styles.profileDetail}>
              <Text style={styles.profileDetailLabel}>Firm</Text>
              <Text style={styles.profileDetailValue}>{profileData.firm}</Text>
            </View>
          )}
          {profileData.company_name && (
            <View style={styles.profileDetail}>
              <Text style={styles.profileDetailLabel}>Company</Text>
              <Text style={styles.profileDetailValue}>{profileData.company_name}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={openProfile}
          activeOpacity={0.7}
          disabled={profileLoading}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarInitial}>
                {name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
        <View style={{ width: 26 }} />
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fbbf24" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 6 }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={text}
          onChangeText={handleTextChange}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={20} color={text.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060611' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#0d0e1a', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)', gap: 8,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16 },
  headerAvatarPlaceholder: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarInitial: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  headerName: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList: { padding: 16, gap: 6 },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginBottom: 2 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: 'rgba(251,191,36,0.15)', borderBottomRightRadius: 4 },
  bubbleThem: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)',
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: '#ffffff' },
  bubbleTextThem: { color: '#ffffff' },
  bubbleTime: { fontSize: 11, marginTop: 4 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.5)', textAlign: 'right' },
  bubbleTimeThem: { color: 'rgba(255,255,255,0.3)' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8,
    backgroundColor: '#0d0e1a', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)', gap: 8,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#ffffff',
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.1)' },

  profileHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#0d0e1a', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)', gap: 12,
  },
  profileHeaderTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
  profileContent: { flex: 1, alignItems: 'center', padding: 24 },
  profileAvatar: { width: 100, height: 100, borderRadius: 50 },
  profileAvatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarInitial: { fontSize: 40, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  profileName: { fontSize: 24, fontWeight: '800', color: '#ffffff', marginTop: 16 },
  profileHeadline: { fontSize: 15, color: 'rgba(255,255,255,0.4)', marginTop: 6, textAlign: 'center' },
  profileMeta: { flexDirection: 'row', gap: 8, marginTop: 14 },
  profileChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  profileChipText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  profileDetail: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 16, marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)',
  },
  profileDetailLabel: {
    fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, color: 'rgba(255,255,255,0.3)', marginBottom: 4,
  },
  profileDetailValue: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
});
