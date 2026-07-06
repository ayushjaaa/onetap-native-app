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
};
