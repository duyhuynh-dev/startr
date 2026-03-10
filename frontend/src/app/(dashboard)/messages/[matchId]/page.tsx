/**
 * Individual conversation thread – Clean light theme
 */

'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { messagingApi, type ConversationThread } from '@/lib/api/messaging';
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
        <div className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/messages')}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            {thread && (
              <div className="flex items-center gap-2">
                {thread.other_party_avatar_url ? (
                  <img
                    src={thread.other_party_avatar_url}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-700">
                    {thread.other_party_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-900 leading-tight">
                    {thread.other_party_name}
                  </span>
                </div>
              </div>
            )}
          </div>
          {isConnected && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Live
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full" />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-12">No messages yet. Say hi!</p>
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
                            : 'underline text-sky-600 hover:text-sky-700 break-all'
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
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-700 shrink-0">
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
                            ? 'bg-slate-900 text-white rounded-br-md'
                            : 'bg-white border border-slate-200 text-slate-900 rounded-bl-md'
                        } ${message._uiSendStatus === 'failed' ? 'ring-1 ring-red-300 cursor-pointer' : ''}`}
                      >
                        <p className="text-sm leading-relaxed break-all">
                          {renderMessageContent(message.content, isOwn)}
                        </p>
                      </div>

                      {isOwn && (
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
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
                          <span className="text-[11px] text-red-500">Failed to send. Tap to retry.</span>
                        ) : message.read_at ? (
                          <span className="text-[11px] text-slate-500">Seen {formatSeenTime(message.read_at)}</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 rounded-bl-md">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 bg-white px-6 py-3 shrink-0">
          <div className="max-w-2xl mx-auto">
            {error && (
              <div className="mb-2 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-xs">{error}</div>
            )}
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type a message..."
                disabled={isSending}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-colors"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSending ? '...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
