import apiClient from './client';

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

export async function getPromptTemplates(params?: {
  role?: 'investor' | 'founder';
  is_active?: boolean;
}): Promise<PromptTemplate[]> {
  const res = await apiClient.get<PromptTemplate[]>('/prompts', { params });
  return res.data;
}
