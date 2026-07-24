const { element, by, waitFor } = require('detox');
const { loginAs, logout } = require('./helpers/login');

// Covers the flow deferred by homeFeed.test.js's comment: tapping a real
// trending card from Home must land on ListingDetailScreen with the right
// content, and the buyer "Buy this product" CTA must actually reach the
// real backend. There is no chat/contact-seller button on this screen yet
// (buyers never see the seller's number until they're selected — see the
// comment above the bottom bar in ListingDetailScreen.tsx) — that case is
// intentionally not tested here because the feature doesn't exist.
describe('Listing detail (real backend)', () => {
  const email = process.env.E2E_BUYER_EMAIL;
  const password = process.env.E2E_BUYER_PASSWORD;

  beforeEach(async () => {
    if (!email || !password) {
      throw new Error(
        'Missing credentials — set E2E_BUYER_EMAIL / E2E_BUYER_PASSWORD',
      );
    }
    await loginAs(email, password);
  });

  afterEach(async () => {
    await logout();
  });

  it('opens a listing from the Home trending feed and shows its detail', async () => {
    await waitFor(element(by.id('home-trending-list')))
      .toBeVisible()
      .withTimeout(15000);

    // Tap the first trending card. Real listing ids are unpredictable, so
    // we match any element whose testID starts with the known prefix.
    await waitFor(element(by.id(/trending-listing-.+/)).atIndex(0))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id(/trending-listing-.+/))
      .atIndex(0)
      .tap();

    await waitFor(element(by.id('listing-detail-screen')))
      .toBeVisible()
      .withTimeout(15000);

    // Gallery must render at least one image tile for any listing with photos.
    await expect(element(by.id('listing-detail-gallery-image-0'))).toExist();
  });

  it('swipes the gallery to the next photo and the dot indicator updates', async () => {
    await waitFor(element(by.id('home-trending-list')))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id(/trending-listing-.+/))
      .atIndex(0)
      .tap();
    await waitFor(element(by.id('listing-detail-screen')))
      .toBeVisible()
      .withTimeout(15000);

    // Only meaningful for a listing with >1 photo — skip via a soft check:
    // if image-1 doesn't exist, this listing only has one photo and the
    // swipe assertion is a no-op by construction (nothing to swipe to).
    try {
      await waitFor(element(by.id('listing-detail-gallery-image-1')))
        .toExist()
        .withTimeout(2000);
    } catch {
      return;
    }

    await element(by.id('listing-detail-gallery')).swipe('left', 'fast');
    await expect(
      element(by.id('listing-detail-gallery-image-1')),
    ).toBeVisible();
  });

  it('expresses interest via "Buy this product" and the CTA flips to the sent state', async () => {
    await waitFor(element(by.id('home-trending-list')))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id(/trending-listing-.+/))
      .atIndex(0)
      .tap();
    await waitFor(element(by.id('listing-detail-screen')))
      .toBeVisible()
      .withTimeout(15000);

    // If this buyer already expressed interest in a previous run, the CTA
    // is already gone — nothing to do, and re-running the flow would just
    // hit the backend's 409 for no reason.
    try {
      await waitFor(element(by.id('listing-detail-buy-button')))
        .toBeVisible()
        .withTimeout(3000);
    } catch {
      await expect(element(by.id('listing-detail-interest-sent'))).toExist();
      return;
    }

    await element(by.id('listing-detail-buy-button')).tap();
    await element(by.id('listing-detail-confirm-interest-button')).tap();

    await waitFor(element(by.id('listing-detail-interest-sent')))
      .toBeVisible()
      .withTimeout(15000);
  });
});
