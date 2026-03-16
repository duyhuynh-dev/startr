/**
 * Likes Queue – Clean light theme
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useToast, MatchModal } from '@/components/ui';
import { feedApi } from '@/lib/api/feed';
import { matchesApi } from '@/lib/api/matches';
import { messagingApi } from '@/lib/api/messaging';
import type { LikesQueueItem } from '@/lib/api/feed';
import type { ConversationThread } from '@/lib/api/messaging';
import { useRouter } from 'next/navigation';

export default function LikesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [likes, setLikes] = useState<LikesQueueItem[]>([]);
  const [matches, setMatches] = useState<ConversationThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedName, setMatchedName] = useState('');

  const loadLikes = async () => {
    if (!user?.profile_id) return;
    setIsLoading(true);
    setError('');

    try {
      const likesData = await feedApi.getLikesQueue();
      setLikes(likesData);
      const conversationsData = await messagingApi.getConversations();
      setMatches(conversationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load likes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLikes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.profile_id]);

  const handleLikeBack = async (recipientId: string) => {
    if (!user?.profile_id) return;
    const likedPerson = likes.find((l) => l.profile.id === recipientId);
    try {
      const response = await matchesApi.sendLike({
        sender_id: user.profile_id,
        recipient_id: recipientId,
      });
      if (response.status === 'matched') {
        setMatchedName(likedPerson?.profile.full_name || 'Someone');
        setMatchModalOpen(true);
      }
      loadLikes();
    } catch (err) {
      toast('Failed to like back', 'error');
    }
  };

  const handlePass = async (recipientId: string) => {
    if (!user?.profile_id) return;
    setLikes(likes.filter((item) => item.profile.id !== recipientId));
    toast('Passed', 'info');
    try {
      await matchesApi.passOnProfile({
        user_id: user.profile_id,
        passed_profile_id: recipientId,
      });
    } catch (err) {
      toast('Failed to pass', 'error');
    }
  };

  const formatLastActive = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Header */}
        <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl px-6 lg:px-10 py-5">
          <h1 className="text-2xl font-semibold text-white">Likes</h1>
          <p className="text-sm text-white/40 mt-0.5">People who liked you and your matches.</p>
        </div>

        {!isLoading && !error && likes.length === 0 && matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
              <svg className="w-7 h-7 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">No likes yet</h2>
            <p className="text-sm text-white/40">Keep browsing to get more matches.</p>
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
              <div className="space-y-8">
                {/* Matches */}
                {matches.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Matches</h2>
                    <div className="space-y-2">
                      <AnimatePresence>
                        {matches.map((match, i) => (
                          <motion.div
                            key={match.match_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {match.other_party_avatar_url ? (
                                <img src={match.other_party_avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-sm font-semibold shrink-0">
                                  {match.other_party_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-white truncate">{match.other_party_name}</p>
                                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Matched
                                  </span>
                                </div>
                                {match.last_message_preview && (
                                  <p className="text-xs text-white/40 truncate mt-0.5">{match.last_message_preview}</p>
                                )}
                                {match.unread_count > 0 && (
                                  <p className="text-xs text-blue-400 font-medium mt-0.5">{match.unread_count} unread</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <Link
                                href={`/profile/${match.other_party_id}`}
                                className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                                title="View profile"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </Link>
                              <button
                                type="button"
                                onClick={() => router.push(`/messages/${match.match_id}`)}
                                className="px-4 py-2 rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] text-xs font-semibold hover:from-amber-500 hover:to-yellow-600 transition-colors"
                              >
                                Message
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Pending likes */}
                {likes.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">People who liked you</h2>
                    <div className="space-y-2">
                      <AnimatePresence>
                        {likes.map((item, i) => (
                          <motion.div
                            key={item.like_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative shrink-0">
                                {item.profile.avatar_url ? (
                                  <img src={item.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 text-sm font-semibold">
                                    {item.profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                )}
                                {item.is_online && (
                                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#060611]" title="Online now" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">{item.profile.full_name}</p>
                                {(item.is_online || item.last_active_at) && (
                                  <p className="text-[11px] text-white/40 mt-0.5">
                                    {item.is_online ? 'Online now' : item.last_active_at ? `Active ${formatLastActive(item.last_active_at)}` : null}
                                  </p>
                                )}
                                {item.profile.headline && (
                                  <p className="text-xs text-white/40 truncate mt-0.5">{item.profile.headline}</p>
                                )}
                                {item.note && (
                                  <p className="text-xs text-white/30 italic mt-1 truncate">&ldquo;{item.note}&rdquo;</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <Link
                                href={`/profile/${item.profile.id}`}
                                className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                                title="View profile"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </Link>
                              <button
                                type="button"
                                onClick={() => handlePass(item.profile.id)}
                                className="px-3 py-2 rounded-xl border border-white/10 text-xs font-medium text-white/50 hover:bg-white/5 transition-colors"
                              >
                                Pass
                              </button>
                              <button
                                type="button"
                                onClick={() => handleLikeBack(item.profile.id)}
                                className="px-4 py-2 rounded-xl bg-linear-to-r from-amber-400 to-yellow-500 text-[#060611] text-xs font-semibold hover:from-amber-500 hover:to-yellow-600 transition-colors"
                              >
                                Like back
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
        <MatchModal
          isOpen={matchModalOpen}
          matchName={matchedName}
          onClose={() => setMatchModalOpen(false)}
        />
      </div>
    </ProtectedRoute>
  );
}
