/**
 * Authentication Context and Provider
 */

'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import type { UserResponse, TokenResponse } from '@/lib/api/types';

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, role: 'investor' | 'founder', fullName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user on mount if authenticated
  useEffect(() => {
    const loadUser = async () => {
      if (authApi.isAuthenticated()) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        } catch (error) {
          // Token invalid, clear auth
          authApi.logout();
        }
      }
      setIsLoading(false);
    };
    
    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokenResponse: TokenResponse = await authApi.login({ email, password });
    
    // Store tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', tokenResponse.access_token);
      localStorage.setItem('refresh_token', tokenResponse.refresh_token);
    }
    
    // Fetch user data
    const userData = await authApi.getCurrentUser();
    setUser(userData);
  }, []);

  const signup = useCallback(async (
    email: string,
    password: string,
    role: 'investor' | 'founder',
    fullName: string
  ) => {
    const userData = await authApi.signUp({ email, password, role, full_name: fullName });
    setUser(userData);
    
    // After signup, login to get tokens
    const tokenResponse: TokenResponse = await authApi.login({ email, password });
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', tokenResponse.access_token);
      localStorage.setItem('refresh_token', tokenResponse.refresh_token);
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    router.push('/login');
  }, [router]);

  const refreshUser = useCallback(async () => {
    if (authApi.isAuthenticated()) {
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
      } catch (error) {
        logout();
      }
    }
  }, [logout]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

