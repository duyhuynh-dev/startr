/**
 * Messages – Clean light theme
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { messagingApi } from '@/lib/api/messaging';
import type { ConversationThread } from '@/lib/api/messaging';

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadConversations = async () => {
      if (!user?.profile_id) return;
      setIsLoading(true);
      setError('');

      try {
        const data = await messagingApi.getConversations();
        setConversations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [user?.profile_id]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Header */}
        <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl px-6 lg:px-10 py-5">
          <h1 className="text-2xl font-semibold text-white">Messages</h1>
          <p className="text-sm text-white/40 mt-0.5">Your conversations with matches.</p>
        </div>

        {!isLoading && !error && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
              <svg className="w-7 h-7 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">No conversations yet</h2>
            <p className="text-sm text-white/40">Start matching to begin conversations.</p>
          </div>
        ) : (
        <div className="px-6 lg:px-10 py-6">
          <div className="max-w-3xl">
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-amber-400 rounded-full" />
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
            ) : (
              <div className="space-y-1">
                <AnimatePresence>
                  {conversations.map((conv, i) => (
                    <motion.div
                      key={conv.match_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-white/5 transition-colors text-left group"
                    >
                      <button
                        type="button"
                        onClick={() => router.push(`/messages/${conv.match_id}`)}
                        className="flex-1 flex items-center gap-3 min-w-0 text-left"
                      >
                        <div className="relative shrink-0">
                          {conv.other_party_avatar_url ? (
                            <img
                              src={conv.other_party_avatar_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                              conv.unread_count > 0 ? 'bg-amber-500 text-[#060611]' : 'bg-white/10 text-white/50'
                            }`}>
                              {conv.other_party_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-white' : 'font-medium text-white/70'}`}>
                              {conv.other_party_name}
                            </p>
                            {conv.last_message_at && (
                              <span className="text-[11px] text-white/30 shrink-0 ml-2">
                                {new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                          {conv.last_message_preview && (
                            <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-white/50' : 'text-white/30'}`}>
                              {conv.last_message_preview}
                            </p>
                          )}
                        </div>

                        {conv.unread_count > 0 && (
                          <div className="w-5 h-5 rounded-full bg-amber-500 text-[#060611] text-[10px] font-bold flex items-center justify-center shrink-0">
                            {conv.unread_count}
                          </div>
                        )}
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
