import { createMMKV } from 'react-native-mmkv';

const mmkv = createMMKV({ id: 'onetap365.app' });

export const storage = {
  setString: (key: string, value: string) => mmkv.set(key, value),
  getString: (key: string): string | undefined => mmkv.getString(key),

  setBoolean: (key: string, value: boolean) => mmkv.set(key, value),
  getBoolean: (key: string): boolean | undefined => mmkv.getBoolean(key),

  setNumber: (key: string, value: number) => mmkv.set(key, value),
  getNumber: (key: string): number | undefined => mmkv.getNumber(key),

  setObject: <T>(key: string, value: T) => {
    mmkv.set(key, JSON.stringify(value));
  },
  getObject: <T>(key: string): T | null => {
    const raw = mmkv.getString(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  remove: (key: string) => mmkv.remove(key),
  clearAll: () => mmkv.clearAll(),
  contains: (key: string) => mmkv.contains(key),
};
