const { element, by, waitFor } = require('detox');
const { loginAs, logout } = require('./helpers/login');

describe('Home trending feed (Phase 5 — live marketplace listings)', () => {
  it('shows the live feed once location permission is granted and resolved', async () => {
    // Assumes the app's location-permission flow completed during
    // onboarding/login for this test user — see testing guidance doc for
    // the exact setup steps (mock location or a real device fix).
    const email = process.env.E2E_BUYER_EMAIL;
    const password = process.env.E2E_BUYER_PASSWORD;
    if (!email || !password) {
      throw new Error(
        'Missing credentials — set E2E_BUYER_EMAIL / E2E_BUYER_PASSWORD',
      );
    }
    await loginAs(email, password);

    await waitFor(element(by.id('home-trending-list')))
      .toBeVisible()
      .withTimeout(15000);

    await logout();
  });

  // Tapping into a card and verifying ListingDetailScreen is deferred until
  // that screen is wired (Phase 5, next slice) and gets its own testID.
});
