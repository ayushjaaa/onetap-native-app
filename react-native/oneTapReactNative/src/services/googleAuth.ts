import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { env } from '@/config/env';

export type GoogleErrorCode =
  | 'CANCELLED'
  | 'IN_PROGRESS'
  | 'PLAY_SERVICES_UNAVAILABLE'
  | 'DEVELOPER_ERROR'
  | 'NETWORK'
  | 'NO_ID_TOKEN'
  | 'CONFIG_MISSING'
  | 'UNKNOWN';

export type GoogleSignInResult =
  | {
      ok: true;
      idToken: string;
      email: string;
      name: string | null;
      photo: string | null;
    }
  | { ok: false; code: GoogleErrorCode; message: string };

let configured = false;
let configMissing = false;

const configure = (): void => {
  if (configured) return;

  const webClientId = env.GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    configMissing = true;
    if (__DEV__) {
      console.warn(
        '[googleAuth] GOOGLE_WEB_CLIENT_ID is empty. Google Sign-In will not work.',
      );
    }
    return;
  }

  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
    scopes: ['profile', 'email'],
  });
  configured = true;
  if (__DEV__) {
    // Mask the client ID for logging — show first/last 8 chars
    const masked =
      webClientId.length > 16
        ? `${webClientId.slice(0, 8)}…${webClientId.slice(-12)}`
        : '<short>';
    console.log('[googleAuth] configured with webClientId:', masked);
  }
};

const isNetworkMessage = (msg: string): boolean =>
  /network|timeout|connection|unreachable|offline/i.test(msg);

const mapErrorToResult = (err: unknown): GoogleSignInResult => {
  const e = err as { code?: string; message?: string } | undefined;
  const message = e?.message ?? 'Sign-in failed';
  const code = e?.code;

  if (code === statusCodes.SIGN_IN_CANCELLED) {
    return { ok: false, code: 'CANCELLED', message: 'Sign-in cancelled' };
  }
  if (code === statusCodes.IN_PROGRESS) {
    return { ok: false, code: 'IN_PROGRESS', message: 'Already in progress' };
  }
  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return {
      ok: false,
      code: 'PLAY_SERVICES_UNAVAILABLE',
      message: 'Google Play Services unavailable on this device.',
    };
  }
  // Native Android error code for SHA-1/package mismatch
  if (code === 'DEVELOPER_ERROR' || code === '10') {
    return {
      ok: false,
      code: 'DEVELOPER_ERROR',
      message: __DEV__
        ? 'Developer error: check SHA-1 / package name / Web Client ID in Google Cloud Console.'
        : 'Sign-in unavailable. Please try again later.',
    };
  }
  if (isNetworkMessage(message)) {
    return {
      ok: false,
      code: 'NETWORK',
      message: 'Network issue. Check your internet.',
    };
  }
  return { ok: false, code: 'UNKNOWN', message };
};

const signIn = async (): Promise<GoogleSignInResult> => {
  if (!configured && !configMissing) {
    configure();
  }
  if (configMissing) {
    return {
      ok: false,
      code: 'CONFIG_MISSING',
      message: 'Google sign-in is not configured.',
    };
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (response.type !== 'success') {
      return { ok: false, code: 'CANCELLED', message: 'Sign-in cancelled' };
    }

    const { idToken, user } = response.data;
    if (!idToken) {
      return {
        ok: false,
        code: 'NO_ID_TOKEN',
        message: "Google didn't return a token. Please try again.",
      };
    }

    if (__DEV__) {
      // Never log idToken — only safe identifiers
      console.log('[googleAuth] sign-in success for', user.email);
    }

    return {
      ok: true,
      idToken,
      email: user.email,
      name: user.name,
      photo: user.photo,
    };
  } catch (err) {
    const result = mapErrorToResult(err);
    if (__DEV__) {
      const e = err as { code?: string; message?: string; name?: string };
      console.log('[googleAuth] RAW SDK ERROR:', {
        name: e?.name,
        code: e?.code,
        message: e?.message,
        full: JSON.stringify(err, Object.getOwnPropertyNames(err ?? {})),
      });
      if (!result.ok) {
        console.log(
          '[googleAuth] mapped result:',
          result.code,
          '-',
          result.message,
        );
      }
    }
    return result;
  }
};

const signOut = async (): Promise<void> => {
  try {
    await GoogleSignin.signOut();
  } catch {
    // best-effort
  }
};

const revokeAccess = async (): Promise<void> => {
  try {
    await GoogleSignin.revokeAccess();
  } catch {
    // best-effort
  }
};

export const googleAuth = {
  configure,
  signIn,
  signOut,
  revokeAccess,
};
