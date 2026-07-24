import { Platform } from 'react-native';
import Config from 'react-native-config';

type Environment = 'development' | 'staging' | 'production';

const devApiHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
// Gateway (:3000), not the auth-service directly (:3001) — the gateway applies
// rate-limiting, CORS/helmet, and signs the X-User-Context every downstream
// service expects. See onetap-backend CLAUDE.md "Gateway responsibilities".
const defaultDevApiUrl = `http://${devApiHost}:3000/api/v1`;

export const env = {
  API_URL: Config.API_URL ?? defaultDevApiUrl,
  USE_MOCK_OTP: Config.USE_MOCK_OTP === 'true',
  ENV: (Config.ENV ?? 'development') as Environment,
  isDev: (Config.ENV ?? 'development') === 'development',
  isProd: Config.ENV === 'production',
  GOOGLE_WEB_CLIENT_ID: Config.GOOGLE_WEB_CLIENT_ID ?? '',
  MAPS_API_KEY: Config.MAPS_API_KEY ?? '',
  // Detox can't reliably drive the native OS camera/gallery picker (it's
  // outside the RN view tree). Set only in a dedicated .env.e2e, built via
  // `ENVFILE=.env.e2e npm run e2e:build:android` — never in
  // development/staging/production — so useImageUpload can skip straight to
  // a canned photo URL instead of launching the real picker. See
  // useImageUpload.ts.
  E2E_MOCK_PHOTOS: Config.E2E_MOCK_PHOTOS === 'true',
  // Same reasoning as E2E_MOCK_PHOTOS above, for Razorpay: its Checkout SDK
  // opens a native UI outside the RN tree that Detox cannot drive, and a
  // real "success" can't be faked client-side since the backend
  // cryptographically verifies the payment signature (see
  // wallet-service/payment.controller.ts). Only set in .env.e2e — this
  // makes runPayment() short-circuit straight to the same failure/cancel
  // path a real user hitting "Cancel" on Razorpay's sheet would take, so
  // the failure UI + retry flow can be exercised without ever reaching a
  // native screen or the backend's signature check.
  E2E_MOCK_PAYMENTS: Config.E2E_MOCK_PAYMENTS === 'true',
};
