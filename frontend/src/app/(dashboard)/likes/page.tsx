/**
 * Likes Queue - See who liked you
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, Button, LoadingSpinner } from '@/components/ui';
import { feedApi } from '@/lib/api/feed';
import { matchesApi } from '@/lib/api/matches';
import { messagingApi } from '@/lib/api/messaging';
import type { LikesQueueItem } from '@/lib/api/feed';
import type { ConversationThread } from '@/lib/api/messaging';
import { useRouter } from 'next/navigation';
import { staggerContainer, slideUp } from '@/lib/animations';

export default function LikesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [likes, setLikes] = useState<LikesQueueItem[]>([]);
  const [matches, setMatches] = useState<ConversationThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLikes = async () => {
    if (!user?.profile_id) return;

    setIsLoading(true);
    setError('');

    try {
      // Load pending likes (people who liked you but you haven't matched yet)
      const likesData = await feedApi.getLikesQueue(user.profile_id);
      setLikes(likesData);
      
      // Load matches (people you've matched with) - using conversations for profile info
      const conversationsData = await messagingApi.getConversations(user.profile_id);
      setMatches(conversationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load likes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLikes();
  }, [user?.profile_id]);

  const handleLikeBack = async (recipientId: string) => {
    if (!user?.profile_id) return;

    try {
      const response = await matchesApi.sendLike({
        sender_id: user.profile_id,
        recipient_id: recipientId,
      });

      if (response.status === 'matched') {
        // Redirect to messages
        router.push('/messages');
      } else {
        // Reload likes queue
        loadLikes();
      }
    } catch (err) {
      console.error('Failed to like back:', err);
    }
  };

  const handlePass = async (recipientId: string) => {
    // Remove from likes queue (just filter it out locally)
    setLikes(likes.filter((item) => item.profile.id !== recipientId));
  };

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
        <div className="max-w-2xl mx-auto">
          <motion.h1
            className="text-2xl font-bold text-slate-100 mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            Likes You
          </motion.h1>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {likes.length === 0 && matches.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-slate-300 text-lg">No likes or matches yet</p>
                <p className="text-slate-400 mt-2">Keep browsing to get more matches!</p>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              className="space-y-6"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {/* Matches Section */}
              {matches.length > 0 && (
                <motion.div variants={slideUp}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4">Matches</h2>
                  <div className="space-y-4">
                    <AnimatePresence>
                      {matches.map((match, index) => (
                        <motion.div
                          key={match.match_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                        >
                          <Card className="bg-green-50 border-green-200 hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-slate-100">
                                  {match.other_party_name}
                                </h3>
                                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                  ✓ Matched
                                </span>
                              </div>
                              {match.last_message_preview && (
                                <p className="text-sm text-gray-600 mt-1 truncate">
                                  {match.last_message_preview}
                                </p>
                              )}
                              {match.last_message_at && (
                                <p className="text-xs text-gray-400 mt-2">
                                  Matched {new Date(match.last_message_at).toLocaleDateString()}
                                </p>
                              )}
                              {match.unread_count > 0 && (
                                <p className="text-xs text-amber-500 mt-1 font-semibold">
                                  {match.unread_count} unread message{match.unread_count > 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => router.push(`/messages/${match.match_id}`)}
                              >
                                Message
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* Pending Likes Section */}
              {likes.length > 0 && (
                <motion.div variants={slideUp}>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4">Pending Likes</h2>
                  <div className="space-y-4">
                    <AnimatePresence>
                      {likes.map((item, index) => (
                        <motion.div
                          key={item.like_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                        >
                          <Card className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-slate-100">
                                {item.profile.full_name}
                              </h3>
                              {item.profile.headline && (
                                <p className="text-slate-300 mt-1">{item.profile.headline}</p>
                              )}
                              {item.note && (
                                <p className="text-sm text-slate-400 mt-2 italic">"{item.note}"</p>
                              )}
                              <p className="text-xs text-slate-400 mt-2">
                                Liked {new Date(item.liked_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePass(item.profile.id)}
                              >
                                Pass
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleLikeBack(item.profile.id)}
                              >
                                Like Back
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

