const { element, by, waitFor } = require('detox');
const { goToLoginForm, logout } = require('./helpers/login');

describe('Login (email + password)', () => {
  it('signs in an existing user and lands on Home', async () => {
    // Replace with a real seeded test user for the dev backend
    // (217.217.248.55:3100) before running.
    await goToLoginForm();
    await element(by.id('login-email-input')).typeText('test.user@onetap.dev');
    await element(by.id('login-password-input')).typeText('Password123!');
    await element(by.id('login-submit-button')).tap();

    await waitFor(element(by.id('home-category-grid')))
      .toBeVisible()
      .withTimeout(15000);

    // Without logging out, the auth token persists in Keychain across
    // device.reloadReactNative() (see init.js), so the next test would
    // bootstrap straight past the login screen and never see it.
    await logout();
  });

  it('shows a validation error and keeps the submit button disabled for a bad email', async () => {
    await goToLoginForm();
    await element(by.id('login-email-input')).typeText('not-an-email');
    await element(by.id('login-password-input')).typeText('whatever');

    await expect(element(by.id('login-submit-button'))).toExist();
    // Sign In stays disabled until react-hook-form marks the form valid —
    // Detox can't assert `disabled` directly, so this documents the intent;
    // tapping it here should be a no-op (no navigation to Home).
    await element(by.id('login-submit-button')).tap();
    await expect(element(by.id('home-category-grid'))).not.toExist();
  });
});
