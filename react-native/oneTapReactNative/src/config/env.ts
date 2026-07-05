import { Platform } from 'react-native';
import Config from 'react-native-config';

type Environment = 'development' | 'staging' | 'production';

const devApiHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const defaultDevApiUrl = `http://${devApiHost}:3001/api/v1`;

export const env = {
  API_URL: Config.API_URL ?? defaultDevApiUrl,
  USE_MOCK_OTP: Config.USE_MOCK_OTP === 'true',
  ENV: (Config.ENV ?? 'development') as Environment,
  isDev: (Config.ENV ?? 'development') === 'development',
  isProd: Config.ENV === 'production',
  GOOGLE_WEB_CLIENT_ID: Config.GOOGLE_WEB_CLIENT_ID ?? '',
};
