import * as Sentry from '@sentry/react-native';
import { env } from './env';

// Registered onto NavigationContainer's onReady in App.tsx — adds a
// route-change breadcrumb to every crash report so we know which screen
// the user was on.
export const navigationIntegration = Sentry.reactNavigationIntegration();

// Text/images stay masked by default (maskAllText/maskAllImages default to
// true) — this app collects Aadhaar numbers, phone numbers, and KYC data on
// several screens, so replays must never show real field contents.
const mobileReplay = Sentry.mobileReplayIntegration();

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.ENV,
    tracesSampleRate: env.isProd ? 0.2 : 1.0,
    // Replay a small sample of normal sessions, but always replay a session
    // that actually hit an error — that's the one you want to watch.
    replaysSessionSampleRate: env.isProd ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    enabled: true,
    integrations: defaults => [
      ...defaults,
      navigationIntegration,
      mobileReplay,
    ],
  });
}

export { Sentry };
