const { element, by, waitFor } = require('detox');
const { loginAs, logout } = require('./helpers/login');

// Razorpay's Checkout SDK opens a native UI outside the RN view tree, which
// Detox cannot drive, and a real "success" can't be faked here because the
// backend cryptographically verifies the payment signature server-side (see
// wallet-service/payment.controller.ts) — there is no test-mode bypass on
// the backend. So this build MUST run with E2E_MOCK_PAYMENTS=true
// (ENVFILE=.env.e2e), which makes PaymentResultScreen skip straight to the
// same failure/cancel path a real user tapping "Cancel" on Razorpay's sheet
// would hit — see env.ts's E2E_MOCK_PAYMENTS comment. Only the
// failure/retry UI is covered here; a genuine success-path E2E test needs a
// backend-side test/sandbox mode that doesn't exist yet.
describe('Package purchase — payment failure/cancel path (real backend, mocked Razorpay)', () => {
  const email = process.env.E2E_SELLER_PENDING_EMAIL;
  const password = process.env.E2E_SELLER_PENDING_PASSWORD;

  beforeEach(async () => {
    if (!email || !password) {
      throw new Error(
        'Missing credentials — set E2E_SELLER_PENDING_EMAIL / E2E_SELLER_PENDING_PASSWORD',
      );
    }
    await loginAs(email, password);
  });

  afterEach(async () => {
    await logout();
  });

  it('shows real packages fetched from the backend', async () => {
    await element(by.id('nav-post')).tap();
    await waitFor(element(by.id('become-seller-intro-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await element(by.id('become-seller-cta-button')).tap();

    await waitFor(element(by.id('package-selection-screen')))
      .toBeVisible()
      .withTimeout(15000);
  });

  it('a cancelled/failed payment shows the failure view and never grants slots, then retry repeats the same failure', async () => {
    await element(by.id('nav-post')).tap();
    await waitFor(element(by.id('become-seller-intro-screen')))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id('become-seller-cta-button')).tap();
    await waitFor(element(by.id('package-selection-screen')))
      .toBeVisible()
      .withTimeout(15000);

    // Tap the first paid package's "Buy this pack" (free tier renders an
    // "Included" pill instead of a buy button, so it never matches this id
    // pattern).
    await waitFor(element(by.id(/package-buy-.+/)).atIndex(0))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id(/package-buy-.+/))
      .atIndex(0)
      .tap();

    await waitFor(element(by.id('payment-result-screen')))
      .toBeVisible()
      .withTimeout(10000);

    // Real order creation (POST /wallet/payments/initiate) happens against
    // the real backend before the mocked Razorpay rejection kicks in, so
    // this can take a moment — loading, then the mocked cancel lands us on
    // the failure view, never success.
    await waitFor(element(by.id('payment-failure-view')))
      .toBeVisible()
      .withTimeout(15000);
    await expect(
      element(by.text('Payment cancelled by user (E2E mock)')),
    ).toExist();

    // Retry re-runs the exact same flow — must fail the same way, not get
    // stuck or silently flip to success.
    await element(by.id('payment-retry-button')).tap();
    await waitFor(element(by.id('payment-failure-view')))
      .toBeVisible()
      .withTimeout(15000);

    // "Pick a different pack" must actually go back to package selection,
    // not leave the user stranded on a dead-end failure screen.
    await element(by.id('payment-pick-different-button')).tap();
    await waitFor(element(by.id('package-selection-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });
});
