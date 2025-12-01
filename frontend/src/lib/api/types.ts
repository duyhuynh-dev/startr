/**
 * API Type definitions matching backend schemas
 */

// Auth Types
export interface SignUpRequest {
  email: string;
  password: string;
  role: 'investor' | 'founder';
  full_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
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
  is_active: boolean;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
}

// Profile Types
export interface BaseProfile {
  id: string;
  full_name: string;
  headline?: string;
  avatar_url?: string;
  location?: string;
  role: 'investor' | 'founder';
  prompts: Array<{
    id?: string;
    prompt_id: string;
    content: string;
  }>;
  verification: {
    soft_verified: boolean;
    manual_reviewed: boolean;
    accreditation_attested: boolean;
    badges: string[];
  };
  created_at: string;
  updated_at: string;
  // Investor-specific fields
  firm?: string;
  check_size_min?: number;
  check_size_max?: number;
  focus_sectors?: string[];
  focus_stages?: string[];
  accreditation_note?: string;
  // Founder-specific fields
  company_name?: string;
  company_url?: string;
  revenue_run_rate?: number;
  team_size?: number;
  runway_months?: number;
  focus_markets?: string[];
}

export interface ProfileCreate {
  full_name: string;
  email: string; // Required by backend
  headline?: string;
  avatar_url?: string;
  location?: string;
  role: 'investor' | 'founder';
  prompts?: Array<{ content: string; prompt_id: string }>;
  verification?: {
    soft_verified?: boolean;
    manual_reviewed?: boolean;
    accreditation_attested?: boolean;
    badges?: string[];
  };
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

// Match Types
export interface Match {
  id: string;
  founder_id: string;
  investor_id: string;
  status: 'active' | 'archived' | 'blocked' | 'pending' | 'closed';
  created_at: string;
  updated_at: string;
  last_message_preview?: string;
}

export interface LikePayload {
  target_profile_id: string;
  note?: string;
}

// Message Types
export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string;
  read_at?: string;
  created_at: string;
}

export interface MessageCreate {
  match_id: string;
  content: string;
  attachment_url?: string;
}

// Feed Types
export interface FeedProfile extends BaseProfile {
  similarity_score?: number;
  diligence_score?: number;
}

export interface FeedResponse {
  profiles: FeedProfile[];
  next_cursor?: string;
  has_more: boolean;
}

// Common
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

