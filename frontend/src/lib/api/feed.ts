/**
 * Feed API endpoints (Discovery feed, Likes queue)
 */

import apiClient, { getErrorMessage } from '../api-client';
import type { BaseProfile } from './types';

export interface ProfileCard extends BaseProfile {
  compatibility_score?: number;
  like_count?: number;
  has_liked_you?: boolean;
  match_reasons?: string[];
  is_online?: boolean;
  last_active_at?: string | null;
}

export interface DiscoveryFeedResponse {
  profiles: ProfileCard[];
  cursor?: string;
  has_more: boolean;
}

export interface LikesQueueItem {
  profile: BaseProfile;
  like_id: string;
  note?: string;
  liked_at: string;
  is_online?: boolean;
  last_active_at?: string | null;
}

export const feedApi = {
  /**
   * Get discovery feed (ranked profiles)
   */
  async getDiscoveryFeed(params: {
    role?: 'investor' | 'founder';
    limit?: number;
    cursor?: string;
    stages?: string[];
    sectors?: string[];
    location?: string;
    min_check_size?: number;
    max_check_size?: number;
  }): Promise<DiscoveryFeedResponse> {
    try {
      // Profile is derived from auth token; no profile_id in query
      const searchParams = new URLSearchParams();
      if (params.role) searchParams.append('role', params.role);
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.cursor) searchParams.append('cursor', params.cursor);
      if (params.location) searchParams.append('location', params.location);
      if (params.min_check_size) searchParams.append('min_check_size', params.min_check_size.toString());
      if (params.max_check_size) searchParams.append('max_check_size', params.max_check_size.toString());
      
      // Append each array item separately for FastAPI
      params.stages?.forEach(stage => searchParams.append('stages', stage));
      params.sectors?.forEach(sector => searchParams.append('sectors', sector));
      
      const response = await apiClient.get<DiscoveryFeedResponse>(`/feed/discover?${searchParams.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get likes queue (profiles that liked you)
   */
  async getLikesQueue(): Promise<LikesQueueItem[]> {
    try {
      const response = await apiClient.get<LikesQueueItem[]>('/feed/likes-queue');
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

