import axios from 'axios';
import { API_BASE_URL } from '../config';

export interface LoginRequest {
  email: string;
  password: string;
  turnstile_token?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: string;
  email: string;
  profile_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
}

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client': 'mobile',
  },
  timeout: 15000,
});

export async function getTurnstileSiteKey(): Promise<string> {
  try {
    const res = await client.get<{ site_key: string }>('/auth/turnstile-site-key');
    return res.data.site_key || '';
  } catch {
    return '';
  }
}

export async function login(payload: LoginRequest): Promise<{ tokens: TokenResponse; user: UserResponse }> {
  const tokenRes = await client.post<TokenResponse>('/auth/login', payload);
  const tokens = tokenRes.data;

  const meRes = await client.get<UserResponse>('/auth/me', {
    headers: {
      Authorization: `${tokens.token_type} ${tokens.access_token}`,
    },
  });

  return { tokens, user: meRes.data };
}

