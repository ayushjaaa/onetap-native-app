import * as Keychain from 'react-native-keychain';
import { KEYCHAIN_KEYS } from '@/config/constants';

export const secureStorage = {
  saveToken: async (token: string): Promise<void> => {
    await Keychain.setGenericPassword(KEYCHAIN_KEYS.AUTH_TOKEN, token, {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  getToken: async (): Promise<string | null> => {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials && credentials.password) {
        return credentials.password;
      }
      return null;
    } catch {
      return null;
    }
  },

  clearToken: async (): Promise<void> => {
    try {
      await Keychain.resetGenericPassword();
    } catch {
      // Ignore — already cleared
    }
  },
};
