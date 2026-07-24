export const APP_NAME = 'OneTap365';

export const OTP_LENGTH = 6;
export const OTP_TIMER_SECONDS = 120;
export const MOCK_OTP = '123456';
export const OTP_MAX_ATTEMPTS = 3;

export const PHONE_LENGTH = 10;
export const PHONE_PREFIX = '+91';

export const MIN_BID_WALLET = 20000;

export const MIN_PASSWORD_LENGTH = 8;
export const MIN_NAME_LENGTH = 2;

// Must stay longer than SplashScreen's typewriter animation (400ms start
// delay + 1200ms typing = 1600ms) — otherwise a fast bootstrap (cached
// session, quick network) navigates away mid-animation, cutting the brand
// text off before it finishes typing (e.g. showing "OneTap" without "365").
export const SPLASH_MIN_DURATION_MS = 1900;
export const TOAST_DURATION_MS = 3000;

// Foreground poll for new notifications — approximates push without a real
// FCM/APNs/socket pipeline (see NOTIFICATION_POLL_INTERVAL_MS usage).
export const NOTIFICATION_POLL_INTERVAL_MS = 15000;

export const STORAGE_KEYS = {
  USER: 'user_profile',
  HAS_ONBOARDED: 'has_onboarded',
  LAST_LOCATION: 'last_location',
  REAL_LOCATION_RADIUS_KM: 'real_location_radius_km',
  BROWSING_LOCATION_RADIUS_KM: 'browsing_location_radius_km',
} as const;

// Search-radius bounds shared with the backend (see MIN/MAX_DISTANCE_METRES
// in trending.controller.ts / feed.controller.ts) — keep these in sync.
export const RADIUS_MIN_KM = 1;
export const RADIUS_MAX_KM = 200;
export const RADIUS_DEFAULT_KM = 30;

export const KEYCHAIN_KEYS = {
  AUTH_TOKEN: 'authToken',
} as const;
