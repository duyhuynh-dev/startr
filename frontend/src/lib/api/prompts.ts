/**
 * Prompt Templates API endpoints
 */

import apiClient, { getErrorMessage } from '../api-client';

export interface PromptTemplate {
  id: string;
  text: string;
  role: 'investor' | 'founder';
  category?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const promptsApi = {
  /**
   * Get prompt templates (filtered by role and active status)
   */
  async getTemplates(params?: {
    role?: 'investor' | 'founder';
    is_active?: boolean;
  }): Promise<PromptTemplate[]> {
    try {
      const response = await apiClient.get<PromptTemplate[]>('/prompts', { params });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get a specific prompt template by ID
   */
  async getTemplate(templateId: string): Promise<PromptTemplate> {
    try {
      const response = await apiClient.get<PromptTemplate>(`/prompts/${templateId}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

