import { createMMKV } from 'react-native-mmkv';
import { Sentry } from '@/config/sentry';

const mmkv = createMMKV({ id: 'onetap365.app' });

// MMKV writes are synchronous and normally can't fail, but can throw on a
// corrupted/unwritable store (low disk, rare native fault) — several of
// these run directly inside Redux reducers (authSlice, locationSlice),
// where a thrown reducer crashes the dispatch that triggered it. Swallow
// here so a storage failure degrades the feature (e.g. a preference isn't
// persisted) instead of crashing the caller.
function safeWrite(fn: () => void): void {
  try {
    fn();
  } catch (err) {
    Sentry.captureException(err);
  }
}

export const storage = {
  setString: (key: string, value: string) =>
    safeWrite(() => mmkv.set(key, value)),
  getString: (key: string): string | undefined => mmkv.getString(key),

  setBoolean: (key: string, value: boolean) =>
    safeWrite(() => mmkv.set(key, value)),
  getBoolean: (key: string): boolean | undefined => mmkv.getBoolean(key),

  setNumber: (key: string, value: number) =>
    safeWrite(() => mmkv.set(key, value)),
  getNumber: (key: string): number | undefined => mmkv.getNumber(key),

  setObject: <T>(key: string, value: T) => {
    safeWrite(() => mmkv.set(key, JSON.stringify(value)));
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

  remove: (key: string) => safeWrite(() => mmkv.remove(key)),
  clearAll: () => safeWrite(() => mmkv.clearAll()),
  contains: (key: string) => mmkv.contains(key),
};
