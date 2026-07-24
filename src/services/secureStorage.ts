import * as Keychain from 'react-native-keychain';
import { KEYCHAIN_KEYS } from '@/config/constants';

export const secureStorage = {
  saveToken: async (token: string): Promise<void> => {
    const result = await Keychain.setGenericPassword(
      KEYCHAIN_KEYS.AUTH_TOKEN,
      token,
      {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      },
    );
    console.log('[secureStorage] setGenericPassword result:', result);

    // Verify the write actually round-trips before trusting it — on some Android
    // devices/OS versions the Keystore write can resolve successfully without the
    // entry actually being retrievable afterward. Surface that loudly instead of
    // silently proceeding as if the token were saved.
    const check = await Keychain.getGenericPassword();
    console.log(
      '[secureStorage] post-save verification read:',
      check
        ? `password length ${check.password.length}`
        : 'NULL — WRITE DID NOT PERSIST',
    );
    if (!check || check.password !== token) {
      throw new Error(
        'secureStorage.saveToken: write did not persist to Keychain',
      );
    }
  },

  getToken: async (): Promise<string | null> => {
    try {
      const credentials = await Keychain.getGenericPassword();
      console.log(
        '[secureStorage] getToken:',
        credentials ? `password length ${credentials.password.length}` : 'null',
      );
      if (credentials && credentials.password) {
        return credentials.password;
      }
      return null;
    } catch (err) {
      console.log('[secureStorage] getToken threw:', err);
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
