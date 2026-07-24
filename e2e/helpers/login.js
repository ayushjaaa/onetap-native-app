const { element, by, waitFor } = require('detox');

// Logs a signed-out app into a specific seeded test account. Each account
// must already sit at the seller stage its name implies (see
// e2e/postAdGating.test.js for the four stages this suite depends on) —
// this helper does not create or advance accounts, only authenticates.
// AuthNavigator's default initial route is Welcome (Sign In / Create
// Account choice), not the login form directly — see AuthNavigator.tsx. A
// logged-out app landing (fresh launch, or right after logout()) shows this
// first, so it must be dismissed before the login form exists.
async function goToLoginForm() {
  try {
    await waitFor(element(by.id('welcome-screen')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('welcome-sign-in-button')).tap();
  } catch {
    // Already past Welcome (e.g. a caller mid-navigation elsewhere) — fine.
  }

  await waitFor(element(by.id('login-email-input')))
    .toBeVisible()
    .withTimeout(15000);
}

async function loginAs(email, password) {
  await goToLoginForm();

  await element(by.id('login-email-input')).typeText(email);
  await element(by.id('login-password-input')).typeText(password);
  await element(by.id('login-submit-button')).tap();

  await waitFor(element(by.id('home-trending-list')))
    .toBeVisible()
    .withTimeout(15000);
}

async function logout() {
  await element(by.id('nav-profile')).tap();
  await waitFor(element(by.id('profile-logout-button')))
    .toBeVisible()
    .withTimeout(10000);
  await element(by.id('profile-logout-button')).tap();

  // Logging out remounts AuthNavigator fresh, which lands back on Welcome
  // (its default initial route), not the login form directly.
  await waitFor(element(by.id('welcome-screen')))
    .toBeVisible()
    .withTimeout(10000);
}

module.exports = { goToLoginForm, loginAs, logout };
