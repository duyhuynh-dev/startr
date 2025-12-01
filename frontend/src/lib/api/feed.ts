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
}

export const feedApi = {
  /**
   * Get discovery feed (ranked profiles)
   */
  async getDiscoveryFeed(params: {
    profile_id: string;
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
      const response = await apiClient.get<DiscoveryFeedResponse>('/feed/discover', { params });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get likes queue (profiles that liked you)
   */
  async getLikesQueue(profileId: string): Promise<LikesQueueItem[]> {
    try {
      const response = await apiClient.get<LikesQueueItem[]>('/feed/likes-queue', {
        params: { profile_id: profileId },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

