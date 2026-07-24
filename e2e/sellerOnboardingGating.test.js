const { device, element, by, waitFor, expect: detoxExpect } = require('detox');
const { loginAs, logout } = require('./helpers/login');

// Real-device companion to the Jest component tests for SellerTypeScreen,
// IndividualOnboardingScreen and BecomeSellerIntroScreen — those prove the
// redirect *logic* in isolation; this proves the actual back-button/relaunch
// behavior an attacker-shaped user (or just an impatient one) would hit on a
// real device against the real backend, which no amount of component-level
// mocking can substitute for.
//
// Each account must be pre-seeded on the real backend at the exact stage its
// name implies (see e2e/postAdGating.test.js for the same convention):
//   MID_ONBOARDING     sellerType set, submitIndividualSellerProfile not called
//   PROFILE_SUBMITTED  profile submitted, no package bought yet
//   REJECTED           admin has called POST /admin/kyc/:id/reject
//   APPROVED           admin has approved
const ACCOUNTS = {
  MID_ONBOARDING: {
    email: process.env.E2E_SELLER_TYPE_ONLY_EMAIL,
    password: process.env.E2E_SELLER_TYPE_ONLY_PASSWORD,
  },
  PROFILE_SUBMITTED: {
    email: process.env.E2E_SELLER_PENDING_EMAIL,
    password: process.env.E2E_SELLER_PENDING_PASSWORD,
  },
  REJECTED: {
    email: process.env.E2E_SELLER_REJECTED_EMAIL,
    password: process.env.E2E_SELLER_REJECTED_PASSWORD,
  },
  APPROVED: {
    email: process.env.E2E_SELLER_APPROVED_EMAIL,
    password: process.env.E2E_SELLER_APPROVED_PASSWORD,
  },
};

const requireAccount = (stage, account) => {
  if (!account.email || !account.password) {
    throw new Error(
      `Missing credentials for ${stage} — set E2E_${stage}_EMAIL / E2E_${stage}_PASSWORD`,
    );
  }
};

describe('Seller onboarding — back-button / relaunch bypass attempts (real backend, staged accounts)', () => {
  it('a mid-onboarding user who backgrounds and relaunches the app never sees the seller-type picker again', async () => {
    const account = ACCOUNTS.MID_ONBOARDING;
    requireAccount('SELLER_TYPE_ONLY', account);

    await loginAs(account.email, account.password);

    // Deep-link/relaunch straight at the seller flow, simulating a stale
    // nav-stack entry or a user who force-quit mid-onboarding and reopened —
    // SellerTypeScreen's own defensive useEffect must resume them at
    // IndividualOnboarding instead of re-showing the type picker.
    await device.launchApp({ newInstance: false });

    await element(by.id('nav-profile')).tap();
    await element(by.text('Finish seller setup')).tap();

    await waitFor(element(by.id('individual-onboarding-screen')))
      .toBeVisible()
      .withTimeout(15000);
    await detoxExpect(element(by.id('seller-type-screen'))).not.toExist();

    await logout();
  });

  it('a profile-submitted user cannot get back to the onboarding form via hardware back', async () => {
    const account = ACCOUNTS.PROFILE_SUBMITTED;
    requireAccount('SELLER_PENDING', account);

    await loginAs(account.email, account.password);

    await element(by.id('nav-post')).tap();
    await waitFor(element(by.id('become-seller-intro-screen')))
      .toBeVisible()
      .withTimeout(15000);

    // BecomeSellerIntroScreen's handleStart routes a submitted-but-unpaid
    // seller to PackageSelection, not back into the profile form.
    await element(by.id('become-seller-cta-button')).tap();
    await waitFor(element(by.text('Pick a package')))
      .toBeVisible()
      .withTimeout(15000);

    await device.pressBack();

    // Even if back somehow lands on IndividualOnboarding, its own
    // resubmission guard must immediately bounce back out.
    await waitFor(element(by.id('become-seller-intro-screen')))
      .toBeVisible()
      .withTimeout(15000);
    await detoxExpect(
      element(by.id('individual-onboarding-screen')),
    ).not.toExist();

    await logout();
  });

  it('a rejected seller has no in-app CTA back into onboarding, at all', async () => {
    const account = ACCOUNTS.REJECTED;
    requireAccount('SELLER_REJECTED', account);

    await loginAs(account.email, account.password);

    await element(by.id('nav-post')).tap();
    await waitFor(element(by.id('become-seller-intro-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await waitFor(element(by.id('become-seller-rejected-hint')))
      .toBeVisible()
      .withTimeout(10000);
    await detoxExpect(element(by.id('become-seller-cta-button'))).not.toExist();

    await logout();
  });

  it('an approved seller landing on BecomeSellerIntro (e.g. stale bookmark) is bounced straight to ListProduct', async () => {
    const account = ACCOUNTS.APPROVED;
    requireAccount('SELLER_APPROVED', account);

    await loginAs(account.email, account.password);

    await element(by.id('nav-post')).tap();

    await waitFor(element(by.id('list-a-product-screen')))
      .toBeVisible()
      .withTimeout(15000);
    await detoxExpect(
      element(by.id('become-seller-intro-screen')),
    ).not.toExist();

    await logout();
  });
});
