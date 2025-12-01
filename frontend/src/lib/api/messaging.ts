/**
 * Messaging API endpoints
 */

import apiClient, { getErrorMessage } from '../api-client';
import type { Message, MessageCreate } from './types';

export interface ConversationThread {
  match_id: string;
  founder_id: string;
  investor_id: string;
  other_party_id: string;
  other_party_name: string;
  other_party_avatar_url?: string;
  last_message_preview?: string;
  last_message_at?: string;
  unread_count: number;
  status: string;
}

export const messagingApi = {
  /**
   * Send a message
   */
  async sendMessage(payload: MessageCreate & { sender_id: string }): Promise<Message> {
    try {
      const response = await apiClient.post<Message>('/messages', payload);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get messages in a thread
   */
  async getMessages(
    matchId: string,
    profileId: string,
    limit: number = 50
  ): Promise<Message[]> {
    try {
      const response = await apiClient.get<Message[]>(`/messages/${matchId}`, {
        params: { profile_id: profileId, limit },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get conversation threads (list of matches with previews)
   */
  async getConversations(profileId: string): Promise<ConversationThread[]> {
    try {
      const response = await apiClient.get<ConversationThread[]>('/messages', {
        params: { profile_id: profileId },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Mark messages as read
   * NOTE: Messages are automatically marked as read when fetched via getMessages()
   * This method is kept for backward compatibility but is not needed.
   */
  async markAsRead(matchId: string, profileId: string): Promise<void> {
    // Messages are automatically marked as read when fetched
    // This method is a no-op for now
    return Promise.resolve();
  },
};

