/**
 * Individual conversation thread – Clean light theme
 */

'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { messagingApi, type ConversationThread } from '@/lib/api/messaging';
import { profilesApi } from '@/lib/api/profiles';
import type { Message } from '@/lib/api/types';

type UiSendStatus = 'sending' | 'failed';
type UiMessage = Message & { _uiSendStatus?: UiSendStatus };

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isConnected, subscribeToMessages, subscribeToTyping, subscribeToDelivered, subscribeToRead, sendTypingIndicator, sendMarkRead } = useWebSocketContext();
  const matchId = params.matchId as string;

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!user?.profile_id || !matchId) return;
      setIsLoading(true);
      setError('');
      try {
        const data = await messagingApi.getMessages(matchId);
        setMessages(data as UiMessage[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };
    loadMessages();
  }, [user?.profile_id, matchId]);

  // Load conversation metadata (other party name + avatar)
  useEffect(() => {
    const loadThread = async () => {
      if (!user?.profile_id || !matchId) return;
      try {
        const threads = await messagingApi.getConversations();
        const found = threads.find((t) => t.match_id === matchId);
        if (found) setThread(found);
      } catch {
        // Non-critical – header/avatar details are optional
      }
    };
    loadThread();
  }, [user?.profile_id, matchId]);

  useEffect(() => {
    if (!matchId || !isConnected) return;

    const unsubscribeMessages = subscribeToMessages(matchId, (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;

        // If this is an echo of our own message, replace the first optimistic send.
        if (msg.sender_id === user?.profile_id) {
          const idx = prev.findIndex((m) => m._uiSendStatus && m.sender_id === msg.sender_id && m.match_id === msg.match_id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = msg as UiMessage;
            return next;
          }
        }

        return [...prev, msg as UiMessage];
      });
      // If we are viewing this thread and the message is from the other user, mark it as read immediately
      if (msg.sender_id !== user?.profile_id) {
        sendMarkRead(msg.id);
      }
      scrollToBottom();
    });

    const unsubscribeTyping = subscribeToTyping(matchId, (isTypingValue: boolean, senderId: string) => {
      if (senderId !== user?.profile_id) {
        setIsTyping(isTypingValue);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (isTypingValue) {
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
        }
      }
    });

    const unsubscribeDelivered = subscribeToDelivered(matchId, (messageId, deliveredAt) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, delivered_at: deliveredAt ?? m.delivered_at } : m))
      );
    });

    const unsubscribeRead = subscribeToRead(matchId, (messageId, readAt) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, read_at: readAt ?? m.read_at } : m))
      );
    });

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
      unsubscribeDelivered();
      unsubscribeRead();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [matchId, isConnected, subscribeToMessages, subscribeToTyping, subscribeToDelivered, subscribeToRead, sendMarkRead, user?.profile_id]);

  const openProfile = useCallback(async () => {
    if (!thread?.other_party_id) return;
    if (profileData) { setProfileOpen(true); return; }
    setProfileLoading(true);
    try {
      const data = await profilesApi.getProfile(thread.other_party_id);
      setProfileData(data);
      setProfileOpen(true);
    } catch {}
    setProfileLoading(false);
  }, [thread, profileData]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(e.target.value);
      const now = Date.now();
      if (now - lastTypingSentRef.current > 2000) {
        sendTypingIndicator(matchId, true);
        lastTypingSentRef.current = now;
      }
    },
    [matchId, sendTypingIndicator]
  );

  useEffect(() => {
    if (!newMessage.trim()) {
      sendTypingIndicator(matchId, false);
    }
  }, [newMessage, matchId, sendTypingIndicator]);

  const retrySend = async (localId: string) => {
    const msg = messages.find((m) => m.id === localId);
    if (!msg || msg.sender_id !== user?.profile_id) return;
    if (isSending) return;

    setIsSending(true);
    setError('');
    setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, _uiSendStatus: 'sending' as const } : m)));

    try {
      const sent = await messagingApi.sendMessage({
        match_id: matchId,
        content: msg.content,
        attachment_url: msg.attachment_url,
      });
      setMessages((prev) => prev.map((m) => (m.id === localId ? (sent as UiMessage) : m)));
      scrollToBottom();
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, _uiSendStatus: 'failed' as const } : m)));
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.profile_id || isSending) return;
    setIsSending(true);
    setError('');
    sendTypingIndicator(matchId, false);

    const content = newMessage.trim();
    const localId = `local-${Date.now()}`;
    const optimistic: UiMessage = {
      id: localId,
      match_id: matchId,
      sender_id: user.profile_id,
      content,
      created_at: new Date().toISOString(),
      _uiSendStatus: 'sending',
    };

    setMessages((prev) => [...prev, optimistic]);
    setNewMessage('');
    scrollToBottom();

    try {
      const sent = await messagingApi.sendMessage({
        match_id: matchId,
        content,
      });
      setMessages((prev) => prev.map((m) => (m.id === localId ? (sent as UiMessage) : m)));
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.id === localId ? { ...m, _uiSendStatus: 'failed' as const } : m)));
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const lastOutgoingId = (() => {
    const mine = messages.filter((m) => m.sender_id === user?.profile_id);
    // Prefer the latest message (including optimistic) as the one to show status beneath.
    return mine.length ? mine[mine.length - 1].id : null;
  })();

  const formatSeenTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/messages')}
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            {thread && (
              <button
                type="button"
                onClick={openProfile}
                disabled={profileLoading}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              >
                {thread.other_party_avatar_url ? (
                  <img src={thread.other_party_avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white/70">
                    {thread.other_party_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <span className="text-sm font-semibold text-white">{thread.other_party_name}</span>
                <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
          {isConnected && (
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Live
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-amber-400 rounded-full" />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-sm text-white/30 py-12">No messages yet. Say hi!</p>
              )}
              {messages.map((message) => {
                const isOwn = message.sender_id === user?.profile_id;
                const otherAvatar = thread?.other_party_avatar_url;
                const otherInitial = thread?.other_party_name?.charAt(0)?.toUpperCase() || '?';
                const selfAvatar = user?.avatar_url;
                const selfInitial = user?.full_name?.charAt(0)?.toUpperCase() || 'You';
                const isLatestOutgoing = isOwn && message.id === lastOutgoingId;

                const renderMessageContent = (text: string, isOwnMessage: boolean) => {
                  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
                  const parts: (string | ReactNode)[] = [];
                  let lastIndex = 0;

                  text.replace(urlRegex, (match, _group, offset) => {
                    if (typeof offset === 'number' && offset > lastIndex) {
                      parts.push(text.slice(lastIndex, offset));
                    }
                    const href = match.startsWith('http') ? match : `https://${match}`;
                    parts.push(
                      <a
                        key={`${match}-${offset}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={
                          isOwnMessage
                            ? 'underline text-sky-300 hover:text-sky-200 break-all'
                            : 'underline text-sky-400 hover:text-sky-300 break-all'
                        }
                      >
                        {match}
                      </a>
                    );
                    lastIndex = (offset as number) + match.length;
                    return match;
                  });

                  if (lastIndex < text.length) {
                    parts.push(text.slice(lastIndex));
                  }

                  return parts;
                };

                return (
                  <div key={message.id} className="space-y-1">
                    <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {!isOwn && (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold text-white/70 shrink-0">
                          {otherAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={otherAvatar}
                              alt=""
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            otherInitial
                          )}
                        </div>
                      )}

                      <div
                        role={message._uiSendStatus === 'failed' ? 'button' : undefined}
                        tabIndex={message._uiSendStatus === 'failed' ? 0 : undefined}
                        onClick={message._uiSendStatus === 'failed' ? () => retrySend(message.id) : undefined}
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                          isOwn
                            ? 'bg-linear-to-r from-amber-500/80 to-yellow-500/80 text-white rounded-br-md'
                            : 'bg-white/5 border border-white/10 text-white rounded-bl-md'
                        } ${message._uiSendStatus === 'failed' ? 'ring-1 ring-red-300 cursor-pointer' : ''}`}
                      >
                        <p className="text-sm leading-relaxed break-all">
                          {renderMessageContent(message.content, isOwn)}
                        </p>
                      </div>

                      {isOwn && (
                        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-[11px] font-semibold text-[#060611] shrink-0">
                          {selfAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selfAvatar}
                              alt=""
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            selfInitial
                          )}
                        </div>
                      )}
                    </div>

                    {isLatestOutgoing && (
                      <div className="flex justify-end">
                        {message._uiSendStatus === 'failed' ? (
                          <span className="text-[11px] text-red-400">Failed to send. Tap to retry.</span>
                        ) : message.read_at ? (
                          <span className="text-[11px] text-white/40">Seen {formatSeenTime(message.read_at)}</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 rounded-bl-md">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-white/10 bg-white/5 backdrop-blur-xl px-6 py-3 shrink-0">
          <div className="max-w-2xl mx-auto">
            {error && (
              <div className="mb-2 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-xl text-xs">{error}</div>
            )}
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type a message..."
                disabled={isSending}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-white/20 transition-colors"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="px-5 py-2.5 rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] text-sm font-semibold hover:from-amber-500 hover:to-yellow-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSending ? '...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
        {/* Profile slide-out panel */}
        <AnimatePresence>
          {profileOpen && profileData && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-40"
                onClick={() => setProfileOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0d0e1a] border-l border-white/10 z-50 shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white">Profile</h2>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/30 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="flex flex-col items-center text-center mb-6">
                    {profileData.avatar_url ? (
                      <img src={profileData.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover mb-4" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-3xl font-bold text-white/40 mb-4">
                        {profileData.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-white">{profileData.full_name}</h3>
                    {profileData.headline && (
                      <p className="text-sm text-white/40 mt-1">{profileData.headline}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {profileData.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {profileData.location}
                        </span>
                      )}
                      <span className="inline-flex items-center text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-full capitalize">
                        {profileData.role}
                      </span>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="space-y-3">
                    {profileData.firm && (
                      <div className="bg-white/5 rounded-xl px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Firm</p>
                        <p className="text-sm font-medium text-white">{profileData.firm}</p>
                      </div>
                    )}
                    {profileData.company_name && (
                      <div className="bg-white/5 rounded-xl px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Company</p>
                        <p className="text-sm font-medium text-white">{profileData.company_name}</p>
                      </div>
                    )}
                    {profileData.check_size_min != null && profileData.check_size_max != null && (
                      <div className="bg-white/5 rounded-xl px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Check size</p>
                        <p className="text-sm font-medium text-white">
                          ${(profileData.check_size_min / 1000).toFixed(0)}k – ${(profileData.check_size_max / 1000).toFixed(0)}k
                        </p>
                      </div>
                    )}
                    {profileData.focus_sectors?.length > 0 && (
                      <div className="bg-white/5 rounded-xl px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-1.5">Sectors</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profileData.focus_sectors.map((s: string) => (
                            <span key={s} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {profileData.focus_stages?.length > 0 && (
                      <div className="bg-white/5 rounded-xl px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-1.5">Stages</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profileData.focus_stages.map((s: string) => (
                            <span key={s} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {profileData.revenue_run_rate != null && profileData.revenue_run_rate > 0 && (
                      <div className="bg-white/5 rounded-xl px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">MRR</p>
                        <p className="text-sm font-medium text-white">${profileData.revenue_run_rate.toLocaleString()}</p>
                      </div>
                    )}
                    {profileData.team_size != null && profileData.team_size > 0 && (
                      <div className="bg-white/5 rounded-xl px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium mb-0.5">Team</p>
                        <p className="text-sm font-medium text-white">{profileData.team_size} people</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <Link
                      href={`/profile/${thread?.other_party_id}`}
                      className="block w-full text-center py-2.5 rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] text-sm font-semibold hover:from-amber-500 hover:to-yellow-600 transition-colors"
                    >
                      View full profile
                    </Link>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
