/**
 * Matches API endpoints (Like, Pass, List matches, Daily Limits)
 */

import apiClient, { getErrorMessage } from '../api-client';
import type { Match } from './types';

export interface LikePayload {
  sender_id: string;
  recipient_id: string;
  note?: string;
  prompt_id?: string;  // NEW: Like specific prompt
  like_type?: 'standard' | 'rose' | 'superlike';  // NEW: Type of like
}

export interface PassPayload {
  user_id: string;
  passed_profile_id: string;
}

export interface DailyLimits {
  date: string;
  standard_likes_used: number;
  standard_likes_remaining: number;
  standard_likes_limit: number;
  roses_used: number;
  roses_remaining: number;
  roses_limit: number;
}

export interface LikeResponse {
  status: 'matched' | 'pending';
  match: Match | null;
}

export interface MatchRecord extends Match {
  last_message_preview?: string;
  match_outcome?: 'met' | 'didnt_meet' | 'still_talking';
}

export const matchesApi = {
  /**
   * Send a like to another profile
   * Supports standard likes, roses, and commenting on specific prompts
   */
  async sendLike(payload: LikePayload): Promise<LikeResponse> {
    try {
      const response = await apiClient.post<LikeResponse>('/matches/likes', payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Pass (X) on a profile - prevents showing again for 30 days
   */
  async passOnProfile(payload: PassPayload): Promise<void> {
    try {
      await apiClient.post('/matches/pass', payload);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get daily limits status (likes and roses remaining)
   */
  async getDailyLimits(profileId: string): Promise<DailyLimits> {
    try {
      const response = await apiClient.get<DailyLimits>('/matches/limits', {
        params: { profile_id: profileId },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * List all matches for a user
   */
  async listMatches(profileId: string): Promise<MatchRecord[]> {
    try {
      const response = await apiClient.get<MatchRecord[]>('/matches', {
        params: { profile_id: profileId },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

