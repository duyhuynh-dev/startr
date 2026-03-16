/**
 * API Type definitions matching backend schemas
 */

// Auth Types
export interface SignUpRequest {
  email: string;
  password: string;
  role: 'investor' | 'founder';
  full_name: string;
  turnstile_token?: string;
}

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

export interface OAuthAuthorizationResponse {
  authorization_url: string;
  state: string;
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
  last_active_at?: string | null;
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
  // Market & Niche Intelligence (enrichment)
  financial_health?: { estimated_runway_months?: number | null; funding_velocity?: string | null };
  market_sentiment?: string | null;
  niche_moat?: string | null;
  competitor_gap?: string[];
  intelligence_sources?: string[];
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
  delivered_at?: string;
  read_at?: string;
  created_at: string;
}

// Notification Types
export interface Notification {
  id: string;
  recipient_id: string;
  actor_id?: string | null;
  match_id?: string | null;
  message_id?: string | null;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationsListResponse {
  items: Notification[];
  next_cursor?: string | null;
}

export interface UnreadCountResponse {
  unread_count: number;
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

