import apiClient from './client';

export interface LikePayload {
  recipient_id: string;
  note?: string;
  like_type?: 'standard' | 'rose' | 'superlike';
}

export interface LikeResponse {
  status: 'matched' | 'pending';
  match: {
    id: string;
    founder_id: string;
    investor_id: string;
    status: string;
    created_at: string;
  } | null;
}

export interface PassPayload {
  passed_profile_id: string;
}

export async function sendLike(payload: LikePayload): Promise<LikeResponse> {
  const res = await apiClient.post<LikeResponse>('/matches/likes', payload);
  return res.data;
}

export async function passOnProfile(payload: PassPayload): Promise<void> {
  await apiClient.post('/matches/pass', payload);
}
