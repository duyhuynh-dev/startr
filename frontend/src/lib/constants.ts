/**
 * Application constants and configuration
 */

// API Configuration
export const API_TIMEOUT_MS = 30000; // 30 seconds
export const DEFAULT_API_BASE_URL = 'http://localhost:8000/api/v1';
export const DEFAULT_WS_BASE_URL = 'ws://localhost:8000/api/v1/realtime/ws';

// WebSocket Configuration
export const WS_PING_INTERVAL_MS = 30000; // 30 seconds
export const WS_RECONNECT_INTERVAL_MS = 3000; // 3 seconds
export const WS_MAX_RECONNECT_DELAY_MS = 30000; // 30 seconds

// UI Configuration
export const SUCCESS_MESSAGE_DURATION_MS = 3000; // 3 seconds
export const ERROR_MESSAGE_DURATION_MS = 5000; // 5 seconds

// LocalStorage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  ONBOARDING: '/onboarding',
  DISCOVER: '/discover',
  LIKES: '/likes',
  MESSAGES: '/messages',
  PROFILE: '/profile',
} as const;

