import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

import { STORAGE_KEYS } from '../config';
import { login as loginRequest, type LoginRequest, type TokenResponse, type UserResponse } from '../api/auth';
import { setOnUnauthorized } from '../api/client';

interface AuthContextValue {
  user: UserResponse | null;
  isLoading: boolean;
  signupRole: 'founder' | 'investor' | null;
  setSignupRole: (role: 'founder' | 'investor' | null) => void;
  forceShowOnboarding: boolean;
  setForceShowOnboarding: (v: boolean) => void;
  requestShowOnboarding: () => Promise<void>;
  login: (payload: LoginRequest) => Promise<void>;
  loginWithTokens: (tokens: TokenResponse, userInfo: UserResponse) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signupRole, setSignupRole] = useState<'founder' | 'investor' | null>(null);
  const [forceShowOnboarding, setForceShowOnboarding] = useState(false);

  const requestShowOnboarding = useCallback(async () => {
    try {
      const userJson = await SecureStore.getItemAsync('startr_user');
      if (userJson) {
        const u = JSON.parse(userJson) as UserResponse;
        if (u?.id) {
          await SecureStore.deleteItemAsync(`${STORAGE_KEYS.ONBOARDING_DONE_PREFIX}${u.id}`);
        }
      }
    } catch {}
    setForceShowOnboarding(true);
  }, []);

  const bootstrap = useCallback(async () => {
    const BOOTSTRAP_TIMEOUT_MS = 8000;
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, BOOTSTRAP_TIMEOUT_MS);
    try {
      const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      const userJson = await SecureStore.getItemAsync('startr_user');
      if (accessToken && userJson) {
        setUser(JSON.parse(userJson) as UserResponse);
      }
    } catch {
      // Ignore storage errors and show app
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    setOnUnauthorized(() => setUser(null));
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    setIsLoading(true);
    try {
      const { tokens, user: authUser } = await loginRequest(payload);
      await persistSession(tokens, authUser);
      setUser(authUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithTokens = useCallback(async (tokens: TokenResponse, userInfo: UserResponse) => {
    setIsLoading(true);
    try {
      await persistSession(tokens, userInfo);
      setUser(userInfo);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync('startr_user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    signupRole,
    setSignupRole,
    forceShowOnboarding,
    setForceShowOnboarding,
    requestShowOnboarding,
    login,
    loginWithTokens,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function persistSession(tokens: TokenResponse, user: UserResponse) {
  await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
  await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
  await SecureStore.setItemAsync('startr_user', JSON.stringify(user));
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

