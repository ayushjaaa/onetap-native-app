import * as Sentry from '@sentry/react-native';
import { env } from './env';

// Registered onto NavigationContainer's onReady in App.tsx — adds a
// route-change breadcrumb to every crash report so we know which screen
// the user was on.
export const navigationIntegration = Sentry.reactNavigationIntegration();

export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.ENV,
    tracesSampleRate: env.isProd ? 0.2 : 1.0,
    enabled: !env.isDev,
    integrations: defaults => [...defaults, navigationIntegration],
  });
}

export { Sentry };
