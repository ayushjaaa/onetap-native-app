const { element, by, waitFor } = require('detox');

describe('Home trending feed (Phase 5 — live marketplace listings)', () => {
  it('shows the live feed once location permission is granted and resolved', async () => {
    // Assumes the app's location-permission flow completed during
    // onboarding/login for this test user — see testing guidance doc for
    // the exact setup steps (mock location or a real device fix).
    await waitFor(element(by.id('home-trending-list')))
      .toBeVisible()
      .withTimeout(15000);
  });

  // Tapping into a card and verifying ListingDetailScreen is deferred until
  // that screen is wired (Phase 5, next slice) and gets its own testID.
});
