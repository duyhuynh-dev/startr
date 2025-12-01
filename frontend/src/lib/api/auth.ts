/**
 * Auth API endpoints
 */

import apiClient, { getErrorMessage } from '../api-client';
import type { LoginRequest, SignUpRequest, TokenResponse, UserResponse } from './types';

export const authApi = {
  /**
   * Sign up a new user
   */
  async signUp(data: SignUpRequest): Promise<UserResponse> {
    try {
      const response = await apiClient.post<UserResponse>('/auth/signup', data);
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
};

