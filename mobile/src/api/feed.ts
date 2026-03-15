import apiClient from './client';

export interface ProfilePrompt {
  id?: string;
  prompt_id: string;
  content: string;
}

export interface ProfileCard {
  id: string;
  full_name: string;
  headline?: string;
  avatar_url?: string;
  location?: string;
  role: 'investor' | 'founder';
  prompts: ProfilePrompt[];
  compatibility_score?: number;
  is_online?: boolean;
  last_active_at?: string | null;
  // Investor
  firm?: string;
  check_size_min?: number;
  check_size_max?: number;
  focus_sectors?: string[];
  focus_stages?: string[];
  // Founder
  company_name?: string;
  revenue_run_rate?: number;
  team_size?: number;
  runway_months?: number;
}

export interface DiscoveryFeedResponse {
  profiles: ProfileCard[];
  cursor?: string;
  has_more: boolean;
}

export async function getDiscoveryFeed(params?: {
  limit?: number;
  cursor?: string;
  stages?: string[];
  sectors?: string[];
  location?: string;
}): Promise<DiscoveryFeedResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.cursor) searchParams.append('cursor', params.cursor);
  if (params?.location) searchParams.append('location', params.location);
  params?.stages?.forEach((stage) => searchParams.append('stages', stage));
  params?.sectors?.forEach((sector) => searchParams.append('sectors', sector));

  const res = await apiClient.get<DiscoveryFeedResponse>(`/feed/discover?${searchParams.toString()}`);
  return res.data;
}
