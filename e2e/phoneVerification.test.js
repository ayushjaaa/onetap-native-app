const { element, by, waitFor } = require('detox');
const { goToLoginForm } = require('./helpers/login');

// RootNavigator (RootNavigator.tsx) re-checks phoneVerified on every launch,
// independent of a valid token: `if (!user?.phoneVerified) return
// <AuthNavigator initialRouteName="Phone" />`. A logged-in-but-unverified
// user must never reach MainNavigator/Home, no matter how valid their
// credentials are — this proves that gate holds on a real device against
// the real backend, not just in RootNavigator's own logic.
//
// Requires a seeded account whose phone is NOT verified (register flow
// completed, OTP step never finished) — same staged-account convention as
// postAdGating.test.js.
describe('Unverified-phone gating (real backend)', () => {
  const email = process.env.E2E_PHONE_UNVERIFIED_EMAIL;
  const password = process.env.E2E_PHONE_UNVERIFIED_PASSWORD;

  it('logs in successfully but is routed to phone verification, never Home', async () => {
    if (!email || !password) {
      throw new Error(
        'Missing credentials — set E2E_PHONE_UNVERIFIED_EMAIL / E2E_PHONE_UNVERIFIED_PASSWORD',
      );
    }

    await goToLoginForm();
    await element(by.id('login-email-input')).typeText(email);
    await element(by.id('login-password-input')).typeText(password);
    await element(by.id('login-submit-button')).tap();

    // A valid login always succeeds (credentials are correct) — the block
    // is purely on phoneVerified, so this must land on Phone, not an error.
    await waitFor(element(by.id('phone-verification-screen')))
      .toBeVisible()
      .withTimeout(15000);
    await expect(element(by.id('home-trending-list'))).not.toExist();
    await expect(element(by.id('home-category-grid'))).not.toExist();
  });

  it('relaunching the app keeps an unverified user on Phone, not Home', async () => {
    if (!email || !password) {
      throw new Error(
        'Missing credentials — set E2E_PHONE_UNVERIFIED_EMAIL / E2E_PHONE_UNVERIFIED_PASSWORD',
      );
    }

    // init.js's beforeEach already called device.reloadReactNative() before
    // this test — the token from the previous test's login is still in
    // Keychain, so bootstrap should re-hydrate straight back onto Phone
    // without needing to log in again.
    await waitFor(element(by.id('phone-verification-screen')))
      .toBeVisible()
      .withTimeout(15000);
    await expect(element(by.id('home-trending-list'))).not.toExist();

    // Clean up: this account has no reachable "logout" (Profile lives behind
    // MainNavigator, which an unverified phone never reaches) — Phone's own
    // back button is the only path out. With no back-stack (RootNavigator
    // mounted this directly via initialRouteName="Phone"), PhoneScreen's
    // handleBack treats that as abandoning verification and logs out (see
    // PhoneScreen.tsx), so later test files don't inherit this session.
    await element(by.id('header-back-button')).tap();
    await waitFor(element(by.id('welcome-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });
});
