/**
 * Individual conversation thread – Clean light theme
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { messagingApi, type ConversationThread } from '@/lib/api/messaging';
import type { Message } from '@/lib/api/types';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isConnected, subscribeToMessages, subscribeToTyping, sendTypingIndicator } = useWebSocketContext();
  const matchId = params.matchId as string;

  const [messages, setMessages] = useState<Message[]>([]);
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
        setMessages(data);
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
        return [...prev, msg];
      });
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

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [matchId, isConnected, subscribeToMessages, subscribeToTyping, user?.profile_id]);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.profile_id || isSending) return;
    setIsSending(true);
    setError('');
    sendTypingIndicator(matchId, false);

    try {
      const sent = await messagingApi.sendMessage({
        match_id: matchId,
        content: newMessage.trim(),
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      setNewMessage('');
      scrollToBottom();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
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

                const renderMessageContent = (text: string, isOwnMessage: boolean) => {
                  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
                  const parts: (string | JSX.Element)[] = [];
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
                  <div key={message.id} className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
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
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                        isOwn
                          ? 'bg-slate-900 text-white rounded-br-md'
                          : 'bg-white border border-slate-200 text-slate-900 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm leading-relaxed break-all">
                        {renderMessageContent(message.content, isOwn)}
                      </p>
                      <p className="text-[10px] mt-1 text-slate-400">
                        {(() => {
                          let dateStr = message.created_at;
                          if (dateStr && !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
                            dateStr = dateStr + 'Z';
                          }
                          return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
                        })()}
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
