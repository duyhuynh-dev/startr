export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8012/api/v1';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'startr_access_token',
  REFRESH_TOKEN: 'startr_refresh_token',
  ONBOARDING_DONE_PREFIX: 'startr_onboarding_done_',
};

