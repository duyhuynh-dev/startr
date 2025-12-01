/**
 * Profiles API endpoints
 */

import apiClient, { getErrorMessage } from '../api-client';
import type { BaseProfile, ProfileCreate } from './types';

export interface ProfileUpdate {
  full_name?: string;
  headline?: string;
  avatar_url?: string;
  location?: string;
  prompts?: Array<{ content: string; template_id: string }>;
  // Investor-specific
  firm?: string;
  check_size_min?: number;
  check_size_max?: number;
  focus_sectors?: string[];
  focus_stages?: string[];
  accreditation_note?: string;
  // Founder-specific
  company_name?: string;
  company_url?: string;
  revenue_run_rate?: number;
  team_size?: number;
  runway_months?: number;
  focus_markets?: string[];
}

export const profilesApi = {
  /**
   * Create a new profile
   */
  async createProfile(data: ProfileCreate): Promise<BaseProfile> {
    try {
      const response = await apiClient.post<BaseProfile>('/profiles', data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get profile by ID
   */
  async getProfile(profileId: string): Promise<BaseProfile> {
    try {
      const response = await apiClient.get<BaseProfile>(`/profiles/${profileId}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update profile
   */
  async updateProfile(profileId: string, data: ProfileUpdate): Promise<BaseProfile> {
    try {
      const response = await apiClient.put<BaseProfile>(`/profiles/${profileId}`, data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * List profiles (with optional filters)
   */
  async listProfiles(params?: {
    role?: 'investor' | 'founder';
    limit?: number;
    offset?: number;
  }): Promise<BaseProfile[]> {
    try {
      const response = await apiClient.get<BaseProfile[]>('/profiles', { params });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

