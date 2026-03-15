/**
 * View another user's profile (read-only)
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { profilesApi } from '@/lib/api/profiles';
import { realtimeApi } from '@/lib/api/realtime';
import { ProfileView } from '@/components/features/profile/ProfileView';
import type { BaseProfile } from '@/lib/api/types';

export default function ViewProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const profileId = params.id as string;
  const [profile, setProfile] = useState<BaseProfile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profileId || profileId === user?.profile_id) {
      router.replace('/profile');
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await profilesApi.getProfile(profileId);
        setProfile(data);
        try {
          const online = await realtimeApi.isOnline(profileId);
          setIsOnline(online);
        } catch {
          // Ignore - online status is optional
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Profile not found');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [profileId, user?.profile_id, router]);

  if (profileId === user?.profile_id) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl px-6 lg:px-10 py-5">
          <div className="flex items-center gap-4 max-w-3xl">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-white">Profile</h1>
              <p className="text-sm text-white/40 mt-0.5">View profile information</p>
            </div>
          </div>
        </div>

        <div className="px-6 lg:px-10 py-6">
          <div className="max-w-3xl">
            {isLoading ? (
              <div className="flex justify-center py-24">
                <div className="animate-spin w-8 h-8 border-2 border-white/10 border-t-amber-400 rounded-full" />
              </div>
            ) : error || !profile ? (
              <div className="text-center py-24">
                <p className="text-red-400 text-sm mb-4">{error || 'Profile not found'}</p>
                <Link href="/discover" className="text-sm font-medium text-amber-400 hover:text-amber-300 hover:underline">
                  Back to Discover
                </Link>
              </div>
            ) : (
              <ProfileView profile={profile} isOnline={isOnline} lastActiveAt={profile.last_active_at ?? null} />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
