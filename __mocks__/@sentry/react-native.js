// @sentry/react-native ships ESM-only builds Jest's CJS transform chokes on,
// and its native module isn't available under the test renderer anyway —
// stub the exact surface this app calls (App.tsx, sentry.ts, store.ts,
// googleAuth.ts, useBootstrap.ts, notification screens).
module.exports = {
  init: jest.fn(),
  wrap: Component => Component,
  reactNavigationIntegration: jest.fn(() => ({
    registerNavigationContainer: jest.fn(),
  })),
  // sentry.ts calls this at module load time (not inside initSentry()), so
  // it must exist here even though nothing else in this file's mocked
  // surface is exercised by it — its absence used to crash every test that
  // transitively imports storage.ts, before any test body ever ran.
  mobileReplayIntegration: jest.fn(() => ({})),
  captureException: jest.fn(),
  setUser: jest.fn(),
};
