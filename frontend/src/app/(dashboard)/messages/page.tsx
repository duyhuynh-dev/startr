/**
 * Messages - List of conversations
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, LoadingSpinner } from '@/components/ui';
import { messagingApi } from '@/lib/api/messaging';
import type { ConversationThread } from '@/lib/api/messaging';
import { staggerContainer, slideUp } from '@/lib/animations';

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
        const data = await messagingApi.getConversations(user.profile_id);
        setConversations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();
  }, [user?.profile_id]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.h1
            className="text-2xl font-bold text-slate-100 mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            Messages
          </motion.h1>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {conversations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-slate-300 text-lg">No conversations yet</p>
                <p className="text-slate-400 mt-2">Start matching to begin conversations!</p>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              className="space-y-2"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {conversations.map((conv, index) => (
                  <motion.div
                    key={conv.match_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <Card
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => router.push(`/messages/${conv.match_id}`)}
                    >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-100">
                          {conv.other_party_name}
                        </h3>
                        {conv.last_message_preview && (
                          <p className="text-slate-300 mt-1 truncate">
                            {conv.last_message_preview}
                          </p>
                        )}
                        {conv.last_message_at && (
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(conv.last_message_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </p>
                        )}
                      </div>
                      {conv.unread_count > 0 && (
                        <div className="ml-4 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold">
                          {conv.unread_count}
                        </div>
                      )}
                    </div>
                    </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

