const { element, by, waitFor, expect: detoxExpect } = require('detox');
const { loginAs, logout } = require('./helpers/login');

// Each account below must be pre-seeded on the real backend at the exact
// seller stage its name implies — this suite only drives the UI, it does
// not create accounts. Stages mirror the branches in
// src/navigation/postAdRouter.ts:
//   BUYER            no sellerType set
//   SELLER_TYPE_ONLY  sellerType set, submitIndividualSellerProfile not called
//   SELLER_PENDING    profile submitted, admin has not granted identity:kyc_verified
//   SELLER_APPROVED   admin has approved (POST /admin/kyc/:id/approve)
const ACCOUNTS = {
  BUYER: {
    email: process.env.E2E_BUYER_EMAIL,
    password: process.env.E2E_BUYER_PASSWORD,
    expectedScreen: 'become-seller-intro-screen',
  },
  SELLER_TYPE_ONLY: {
    email: process.env.E2E_SELLER_TYPE_ONLY_EMAIL,
    password: process.env.E2E_SELLER_TYPE_ONLY_PASSWORD,
    expectedScreen: 'individual-onboarding-screen',
  },
  SELLER_PENDING: {
    email: process.env.E2E_SELLER_PENDING_EMAIL,
    password: process.env.E2E_SELLER_PENDING_PASSWORD,
    expectedScreen: 'become-seller-intro-screen',
  },
  SELLER_APPROVED: {
    email: process.env.E2E_SELLER_APPROVED_EMAIL,
    password: process.env.E2E_SELLER_APPROVED_PASSWORD,
    expectedScreen: 'list-a-product-screen',
  },
};

const ALL_SCREENS = [
  'become-seller-intro-screen',
  'individual-onboarding-screen',
  'list-a-product-screen',
];

describe('Post-ad navigation gating (real backend, staged seller accounts)', () => {
  Object.entries(ACCOUNTS).forEach(([stage, account]) => {
    it(`routes ${stage} to ${account.expectedScreen} and nowhere else when tapping Post`, async () => {
      if (!account.email || !account.password) {
        throw new Error(
          `Missing credentials for ${stage} — set E2E_${stage}_EMAIL / E2E_${stage}_PASSWORD`,
        );
      }

      await loginAs(account.email, account.password);

      await element(by.id('nav-post')).tap();

      await waitFor(element(by.id(account.expectedScreen)))
        .toBeVisible()
        .withTimeout(15000);

      for (const screen of ALL_SCREENS) {
        if (screen !== account.expectedScreen) {
          await detoxExpect(element(by.id(screen))).not.toExist();
        }
      }

      await logout();
    });
  });

  it('never lands SELLER_APPROVED anywhere but ListProduct, confirming approval is the only real gate', async () => {
    const account = ACCOUNTS.SELLER_APPROVED;
    await loginAs(account.email, account.password);

    await element(by.id('nav-post')).tap();

    await waitFor(element(by.id('list-a-product-screen')))
      .toBeVisible()
      .withTimeout(15000);

    await detoxExpect(
      element(by.id('become-seller-intro-screen')),
    ).not.toExist();
    await detoxExpect(
      element(by.id('individual-onboarding-screen')),
    ).not.toExist();

    await logout();
  });
});
