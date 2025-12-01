/**
 * Individual conversation thread
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button, Input, Card, CardContent, LoadingSpinner } from '@/components/ui';
import { messagingApi } from '@/lib/api/messaging';
import type { Message } from '@/lib/api/types';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isConnected, subscribeToMessages, subscribeToTyping, sendTypingIndicator } = useWebSocketContext();
  const matchId = params.matchId as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!user?.profile_id || !matchId) return;

      setIsLoading(true);
      setError('');

      try {
        const data = await messagingApi.getMessages(matchId, user.profile_id);
        setMessages(data);
        // Messages are automatically marked as read when fetched via getMessages endpoint
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [user?.profile_id, matchId]);

  // Subscribe to WebSocket messages for real-time updates
  // This effect re-runs when isConnected changes, so it will subscribe when WebSocket connects
  useEffect(() => {
    if (!matchId) {
      console.log('No matchId, skipping WebSocket subscription');
      return;
    }
    
    // Wait for WebSocket to connect before subscribing
    if (!isConnected) {
      console.log('WebSocket not connected yet, will subscribe when connected');
      return;
    }

    console.log(`Subscribing to messages for match ${matchId} (WebSocket connected)`);
    const unsubscribeMessages = subscribeToMessages(matchId, (newMessage: Message) => {
      console.log('Received new message via WebSocket:', newMessage);
      setMessages((prev) => {
        // Check if message already exists (prevent duplicates)
        if (prev.some((m) => m.id === newMessage.id)) {
          console.log('Message already exists, skipping duplicate');
          return prev;
        }
        console.log('Adding new message to state');
        return [...prev, newMessage];
      });
      scrollToBottom();
    });

    const unsubscribeTyping = subscribeToTyping(matchId, (isTypingValue: boolean, senderId: string) => {
      if (senderId !== user?.profile_id) {
        setIsTyping(isTypingValue);
        setTypingUserId(isTypingValue ? senderId : null);
        
        // Clear typing indicator after 3 seconds
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (isTypingValue) {
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            setTypingUserId(null);
          }, 3000);
        }
      }
    });

    return () => {
      console.log(`Cleaning up subscriptions for match ${matchId}`);
      unsubscribeMessages();
      unsubscribeTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [matchId, isConnected, subscribeToMessages, subscribeToTyping, user?.profile_id]);

  // Handle typing indicator
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(e.target.value);
      
      // Send typing indicator (throttled to once per 2 seconds)
      const now = Date.now();
      if (now - lastTypingSentRef.current > 2000) {
        sendTypingIndicator(matchId, true);
        lastTypingSentRef.current = now;
      }
    },
    [matchId, sendTypingIndicator]
  );

  // Clear typing indicator when message is sent or input is cleared
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

    // Clear typing indicator
    sendTypingIndicator(matchId, false);

    try {
      const sent = await messagingApi.sendMessage({
        match_id: matchId,
        sender_id: user.profile_id,
        content: newMessage.trim(),
      });

      // Add message to local state immediately for better UX
      // WebSocket will also send it, so we check for duplicates
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) {
          return prev;
        }
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen bg-slate-900">
          <LoadingSpinner size="lg" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-4 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => router.push('/messages')}>
            ← Back
          </Button>
          {isConnected && (
            <div className="flex items-center gap-2 text-xs text-slate-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Connected</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === user?.profile_id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isOwn
                        ? 'bg-amber-500 text-slate-900'
                        : 'bg-slate-800 border border-slate-700 text-slate-100'
                    }`}
                  >
                    <p className={isOwn ? 'text-slate-900' : 'text-slate-100'}>{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwn ? 'text-slate-700' : 'text-slate-100'
                      }`}
                    >
                      {(() => {
                        // Ensure UTC datetime strings are properly parsed
                        let dateStr = message.created_at;
                        // If datetime doesn't end with 'Z', assume it's UTC and add it
                        if (dateStr && !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
                          dateStr = dateStr + 'Z';
                        }
                        const date = new Date(dateStr);
                        return date.toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        });
                      })()}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-slate-800 border border-slate-700">
                  <p className="text-slate-100 text-sm italic">Typing...</p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="bg-slate-800 border-t border-slate-700 px-4 py-4">
          <div className="max-w-3xl mx-auto">
            {error && (
              <div className="mb-2 bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type a message..."
                disabled={isSending}
                className="flex-1"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!newMessage.trim() || isSending}
                isLoading={isSending}
              >
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

