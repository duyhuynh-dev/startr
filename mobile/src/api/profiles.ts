import apiClient from './client';

export interface ProfileData {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  headline?: string;
  avatar_url?: string;
  location?: string;
  firm?: string;
  company_name?: string;
  company_url?: string;
  check_size_min?: number;
  check_size_max?: number;
  focus_sectors?: string[];
  focus_stages?: string[];
  revenue?: number;
  team_size?: number;
  runway_months?: number;
  prompts?: { prompt_id?: string; question: string; answer: string }[];
}

export interface ProfileUpdatePayload {
  full_name?: string;
  headline?: string;
  location?: string;
  firm?: string;
  company_name?: string;
  company_url?: string;
  check_size_min?: number;
  check_size_max?: number;
  focus_sectors?: string[];
  focus_stages?: string[];
  revenue_run_rate?: number;
  team_size?: number;
  runway_months?: number;
  focus_markets?: string[];
  accreditation_note?: string;
  prompts?: Array<{ prompt_id: string; content: string }>;
  extra_metadata?: Record<string, unknown>;
}

export async function getProfile(profileId: string): Promise<ProfileData> {
  const res = await apiClient.get<ProfileData>(`/profiles/${profileId}`);
  return res.data;
}

export async function updateProfile(profileId: string, payload: ProfileUpdatePayload): Promise<ProfileData> {
  const res = await apiClient.put<ProfileData>(`/profiles/${profileId}`, payload);
  return res.data;
}

export async function createProfile(payload: Record<string, any>): Promise<ProfileData> {
  const res = await apiClient.post<ProfileData>('/profiles', payload);
  return res.data;
}
