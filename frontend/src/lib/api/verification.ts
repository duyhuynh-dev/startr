/**
 * Verification API endpoints
 */

import apiClient, { getErrorMessage } from '../api-client';

export interface OTPResponse {
  success: boolean;
  message: string;
  expires_in?: number;
}

export interface VerificationStatus {
  profile_id: string;
  level: number;
  level_name: string;
  badges: string[];
  email_verified: boolean;
  domain_verified: boolean;
  oauth_verified: boolean;
  manually_reviewed: boolean;
  accreditation_attested: boolean;
}

export interface DomainVerificationResponse {
  verified: boolean;
  message: string;
  domain: string;
  user_email_domain?: string;
  instructions?: string[];
}

export const verificationApi = {
  /**
   * Request OTP code for email verification
   */
  async requestEmailOTP(email: string): Promise<OTPResponse> {
    try {
      const response = await apiClient.post<OTPResponse>('/verification/email/request', { email });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Verify email with OTP code
   */
  async verifyEmailOTP(email: string, code: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post<{ message: string }>('/verification/email/verify', {
        email,
        code,
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get verification status for current user
   */
  async getVerificationStatus(): Promise<VerificationStatus> {
    try {
      const response = await apiClient.get<VerificationStatus>('/verification/status');
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get verification status by profile ID
   */
  async getVerificationStatusByProfile(profileId: string): Promise<VerificationStatus> {
    try {
      const response = await apiClient.get<VerificationStatus>(`/verification/status/${profileId}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Request domain verification (for founders)
   */
  async requestDomainVerification(): Promise<DomainVerificationResponse> {
    try {
      const response = await apiClient.post<DomainVerificationResponse>('/verification/domain');
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};
