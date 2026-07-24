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
  captureException: jest.fn(),
  setUser: jest.fn(),
};
