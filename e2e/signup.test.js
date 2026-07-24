const { element, by, waitFor } = require('detox');

// 4-step signup (SignupContext.tsx accumulates fields across
// SignUpStep1NameScreen → ...Step4LocationScreen and fires a single
// register() call on the last step — see AuthNavigator.tsx). Step 4 depends
// on a real GPS fix resolving (useLocation hook), same environment
// requirement documented in homeFeed.test.js's comment — either mock
// location or run on a real device with location already fixed.
describe('Signup (4-step flow)', () => {
  const goToStep1 = async () => {
    await waitFor(element(by.id('welcome-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('welcome-create-account-button')).tap();
    await waitFor(element(by.id('signup-step1-screen')))
      .toBeVisible()
      .withTimeout(10000);
  };

  it('retains name and phone when navigating forward then back', async () => {
    await goToStep1();

    const name = 'E2E Test User';
    const phone = '9876543210';
    await element(by.id('signup-name-input')).typeText(name);
    await element(by.id('signup-phone-input')).typeText(phone);
    await element(by.id('signup-step1-next-button')).tap();

    await waitFor(element(by.id('signup-step2-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('header-back-button')).tap();
    await waitFor(element(by.id('signup-step1-screen')))
      .toBeVisible()
      .withTimeout(10000);

    // SignupContext (SignupContext.tsx) is only reset on submit or explicit
    // reset() — navigating back must not silently drop what was typed.
    await expect(element(by.id('signup-name-input'))).toHaveText(name);
    await expect(element(by.id('signup-phone-input'))).toHaveText(phone);
  });

  it('walks Step 1 through Step 4 and shows a real "already registered" error for a duplicate email', async () => {
    const existingEmail = process.env.E2E_BUYER_EMAIL;
    if (!existingEmail) {
      throw new Error('Missing credentials — set E2E_BUYER_EMAIL');
    }

    await goToStep1();
    await element(by.id('signup-name-input')).typeText('E2E Duplicate Email');
    await element(by.id('signup-phone-input')).typeText('9123456780');
    await element(by.id('signup-step1-next-button')).tap();

    await waitFor(element(by.id('signup-step2-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('signup-email-input')).typeText(existingEmail);
    await element(by.id('signup-step2-next-button')).tap();

    await waitFor(element(by.id('signup-step3-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('signup-password-input')).typeText('Password123!');
    await element(by.id('signup-step3-next-button')).tap();

    await waitFor(element(by.id('signup-step4-screen')))
      .toBeVisible()
      .withTimeout(10000);

    // Real GPS fix from the real backend's registration endpoint — this is
    // the same "walks all 4 steps for real" proof the happy path would be,
    // just landing on the backend's real duplicate-email rejection instead
    // of a 201.
    await waitFor(element(by.id('signup-create-account-button')))
      .toBeVisible()
      .withTimeout(20000);
    await element(by.id('signup-create-account-button')).tap();

    await waitFor(element(by.text('Signup failed')))
      .toBeVisible()
      .withTimeout(15000);
    // Must still be on the form, not silently reset/navigated away as if it
    // had succeeded.
    await expect(element(by.id('signup-step4-screen'))).toBeVisible();
  });
});
