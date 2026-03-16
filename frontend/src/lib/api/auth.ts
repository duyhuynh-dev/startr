/**
 * Auth API endpoints
 */

import apiClient, { getErrorMessage } from '../api-client';
import type { LoginRequest, SignUpRequest, SignUpResponse, TokenResponse, UserResponse, OAuthAuthorizationResponse } from './types';

export const authApi = {
  /**
   * Sign up a new user. Returns user + tokens (no need to call login; Turnstile token is one-time use).
   */
  async signUp(data: SignUpRequest): Promise<SignUpResponse> {
    try {
      const response = await apiClient.post<SignUpResponse>('/auth/signup', data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<TokenResponse> {
    try {
      const response = await apiClient.post<TokenResponse>('/auth/login', data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<UserResponse> {
    try {
      const response = await apiClient.get<UserResponse>('/auth/me');
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const response = await apiClient.post<TokenResponse>('/auth/refresh', {
        refresh_token: refreshToken,
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Logout (client-side only - clears tokens)
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('access_token');
  },

  /**
   * Get Turnstile site key for the widget
   */
  async getTurnstileSiteKey(): Promise<string> {
    try {
      const response = await apiClient.get<{ site_key: string }>('/auth/turnstile-site-key');
      return response.data.site_key || '';
    } catch {
      return '';
    }
  },

  /**
   * Request a password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/password-reset/request', { email });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Confirm password reset with token and new password
   */
  async confirmPasswordReset(token: string, new_password: string): Promise<void> {
    try {
      await apiClient.post('/auth/password-reset/confirm', { token, new_password });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get Google OAuth authorization URL from the backend
   */
  async getGoogleAuthUrl(redirectUri: string): Promise<OAuthAuthorizationResponse> {
    try {
      const response = await apiClient.get<OAuthAuthorizationResponse>(
        '/auth/oauth/google/authorize',
        { params: { redirect_uri: redirectUri } },
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Exchange Google OAuth code for tokens
   */
  async googleCallback(code: string, redirectUri: string): Promise<TokenResponse> {
    try {
      const response = await apiClient.post<TokenResponse>(
        '/auth/oauth/google/callback',
        { code, redirect_uri: redirectUri },
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};

