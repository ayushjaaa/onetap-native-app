export const APP_NAME = 'OneTap365';

export const OTP_LENGTH = 4;
export const OTP_TIMER_SECONDS = 120;
export const MOCK_OTP = '1234';
export const OTP_MAX_ATTEMPTS = 3;

export const PHONE_LENGTH = 10;
export const PHONE_PREFIX = '+91';

export const MIN_BID_WALLET = 20000;

export const MIN_PASSWORD_LENGTH = 8;
export const MIN_NAME_LENGTH = 2;

export const SPLASH_MIN_DURATION_MS = 1500;
export const TOAST_DURATION_MS = 3000;

export const STORAGE_KEYS = {
  USER: 'user_profile',
  HAS_ONBOARDED: 'has_onboarded',
  LAST_LOCATION: 'last_location',
} as const;

export const KEYCHAIN_KEYS = {
  AUTH_TOKEN: 'authToken',
} as const;
