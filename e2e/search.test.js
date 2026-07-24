const { element, by, waitFor } = require('detox');
const { loginAs, logout } = require('./helpers/login');

// This is a real backend with real, changing listing data (see
// categoryBrowsing.test.js's comment about "live backend categories") — we
// have no fixed seed data to assert exact search results against. So the
// "results appear" case below is a graceful either/or check (results list
// OR empty state, never neither/a crash) rather than asserting specific
// listings, while the empty-state case uses a deliberately nonsense query
// that's guaranteed not to match anything real.
describe('Search (real backend)', () => {
  const email = process.env.E2E_BUYER_EMAIL;
  const password = process.env.E2E_BUYER_PASSWORD;

  beforeEach(async () => {
    if (!email || !password) {
      throw new Error(
        'Missing credentials — set E2E_BUYER_EMAIL / E2E_BUYER_PASSWORD',
      );
    }
    await loginAs(email, password);
    await element(by.id('home-search-bar')).tap();
    await waitFor(element(by.id('search-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  afterEach(async () => {
    // Search screen has no bottom nav, go back to Home before logging out.
    await element(by.text('Cancel')).tap();
    await logout();
  });

  it('shows recent searches by default and submits one on tap', async () => {
    await expect(element(by.text('iPhone 13'))).toExist();

    await element(by.text('iPhone 13')).tap();

    // Submitting must show either matching results or the empty state —
    // never leave the screen stuck on nothing.
    try {
      await waitFor(element(by.id('search-results-list')))
        .toBeVisible()
        .withTimeout(10000);
    } catch {
      await waitFor(element(by.id('search-empty-state')))
        .toBeVisible()
        .withTimeout(3000);
    }
  });

  it('shows the empty state, not a crash, for a query that matches nothing', async () => {
    await element(by.id('search-input')).typeText(
      'zzz-e2e-nonexistent-query-xyz123\n',
    );

    await waitFor(element(by.id('search-empty-state')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(
      element(by.text('No results for "zzz-e2e-nonexistent-query-xyz123"')),
    ).toExist();

    // The screen itself must still be alive and responsive after an
    // empty-result search — not just showing static empty-state text.
    await expect(element(by.id('search-screen'))).toBeVisible();
  });

  it('returns real results or a clean empty state for a broad real-world term, without crashing', async () => {
    await element(by.id('search-input')).typeText('phone\n');

    try {
      await waitFor(element(by.id('search-results-list')))
        .toBeVisible()
        .withTimeout(10000);
      // At least one real ListingCard rendered with an id-based testID —
      // proves this is live backend data, not a stub.
      await expect(element(by.id(/search-result-.+/)).atIndex(0)).toExist();
    } catch {
      await waitFor(element(by.id('search-empty-state')))
        .toBeVisible()
        .withTimeout(3000);
    }
  });
});
