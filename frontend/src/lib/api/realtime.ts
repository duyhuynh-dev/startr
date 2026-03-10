/**
 * Realtime API (online status, etc.)
 */

import apiClient, { getErrorMessage } from '../api-client';

export const realtimeApi = {
  /**
   * Check if a profile is currently online
   */
  async isOnline(profileId: string): Promise<boolean> {
    try {
      const response = await apiClient.get<{ is_online: boolean }>(`/realtime/online/${profileId}`);
      return response.data.is_online;
    } catch {
      return false;
    }
  },
};
