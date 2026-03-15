/**
 * Due Diligence API endpoints
 */

import apiClient, { getErrorMessage } from '../api-client';

export interface Metric {
  name: string;
  value: string | number;
  trend: 'up' | 'flat' | 'down';
  confidence: number;
}

export interface RiskFlag {
  code: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface ExternalData {
  apollo?: {
    company_name?: string;
    industry?: string;
    employee_count?: number;
    total_funding?: number;
    latest_funding_round?: string;
    location?: string;
    technologies?: string[];
    linkedin_url?: string;
  };
  email_verification?: {
    result?: string;
    score?: number;
    disposable?: boolean;
    webmail?: boolean;
  };
  ai_analysis?: {
    summary?: string;
    business_model?: string;
    strengths?: string[];
    risks?: string[];
    competitors?: string[];
    market_size?: string;
  };
  pdl?: {
    company_name?: string;
    industry?: string;
    employee_count?: number;
    employee_range?: string;
    total_funding?: number;
    latest_funding_round?: string;
    company_type?: string;
    location?: string;
    linkedin_url?: string;
    tags?: string[];
  };
  founder?: {
    full_name?: string;
    headline?: string;
    company?: string;
    linkedin_url?: string;
    skills?: string[];
    experience?: Array<{
      title?: string;
      company?: string;
      start_date?: string;
      end_date?: string;
    }>;
    education?: Array<{
      school?: string;
      degree?: string;
      field?: string;
    }>;
  };
}

export interface DiligenceSummary {
  profile_id: string;
  score: number;
  metrics: Metric[];
  risks: RiskFlag[];
  narrative: string | null;
  strengths?: string[];
  concerns?: string[];
  sources_used: string[];
  external_data: ExternalData | null;
  generated_at: string;
}

export const diligenceApi = {
  /**
   * Get due diligence summary for a profile
   */
  async getSummary(profileId: string, forceRefresh = false): Promise<DiligenceSummary> {
    try {
      const response = await apiClient.get<DiligenceSummary>(`/diligence/${profileId}`, {
        params: { force_refresh: forceRefresh },
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};
