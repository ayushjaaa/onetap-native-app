const { device, element, by, waitFor } = require('detox');
const { loginAs, logout } = require('./helpers/login');

// Detox's device.setURLBlacklist() blocks matching requests at the native
// networking layer — the closest thing to "turn off the internet" Detox can
// do deterministically (a real airplane-mode toggle is emulator/host-OS
// specific and flaky in CI). Blacklists the e2e backend host from .env.e2e
// (API_URL=http://217.217.248.55:3100/...) so every RTK Query call fails
// the same way a real dropped connection would.
describe('Network failure — app stays usable, does not crash', () => {
  const email = process.env.E2E_BUYER_EMAIL;
  const password = process.env.E2E_BUYER_PASSWORD;
  const API_HOST_PATTERN = '.*217\\.217\\.248\\.55.*';

  beforeEach(async () => {
    if (!email || !password) {
      throw new Error(
        'Missing credentials — set E2E_BUYER_EMAIL / E2E_BUYER_PASSWORD',
      );
    }
    await loginAs(email, password);
  });

  afterEach(async () => {
    // Always restore network before logging out, or logout's own API call
    // would hang against a still-blacklisted host.
    await device.setURLBlacklist([]);
    await logout();
  });

  it('a search submitted with no backend connectivity shows a clean state, not a crash', async () => {
    await element(by.id('home-search-bar')).tap();
    await waitFor(element(by.id('search-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await device.setURLBlacklist([API_HOST_PATTERN]);

    await element(by.id('search-input')).typeText('phone\n');

    // A failed fetch must not crash the screen — it should still be alive
    // and responsive a few seconds later, whatever state it settles into
    // (RTK Query surfaces this as an error, not a thrown exception).
    await new Promise(resolve => setTimeout(resolve, 3000));
    await expect(element(by.id('search-screen'))).toBeVisible();
    await expect(element(by.id('search-input'))).toBeVisible();

    await device.setURLBlacklist([]);
  });

  it('reloading Home with no backend connectivity does not crash the app', async () => {
    await waitFor(element(by.id('home-trending-list')))
      .toBeVisible()
      .withTimeout(10000);

    await device.setURLBlacklist([API_HOST_PATTERN]);
    await device.reloadReactNative();

    // Bootstrap's getMe call (useBootstrap.ts) will fail against the
    // blacklisted host — it must fall back gracefully (cached user from
    // MMKV, per useBootstrap.ts's offline-mode comment) rather than hang on
    // Splash forever or crash.
    await waitFor(element(by.id('home-trending-list')))
      .toBeVisible()
      .withTimeout(20000);

    await device.setURLBlacklist([]);
  });
});
