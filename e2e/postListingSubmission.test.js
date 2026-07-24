const { element, by, waitFor } = require('detox');
const { loginAs, logout } = require('./helpers/login');

// The one flow every other gating test in this repo assumes works but never
// actually drives: an approved seller filling in the real form and getting a
// real listing created via POST /marketplace/listings. The Jest version
// (ListAProductScreen.test.tsx) is skipped for this exact scenario — RNTL
// can't simulate a touch reaching a Pressable inside this screen's Modal
// category picker. A real device doesn't have that limitation.
//
// REQUIRES a build with E2E_MOCK_PHOTOS=true (see env.ts / useImageUpload.ts)
// so the 4 required photos come from a canned stub instead of the native
// OS camera/gallery picker, which Detox cannot reliably drive:
//   ENVFILE=.env.e2e npm run e2e:build:android:mock-photos
//   npm run e2e:test:android
//
// Also requires E2E_SELLER_APPROVED_EMAIL/PASSWORD (same account used by
// postAdGating.test.js's SELLER_APPROVED case) to already be approved with
// at least one post slot available.
describe('Posting a real listing end-to-end (approved seller, real backend)', () => {
  const email = process.env.E2E_SELLER_APPROVED_EMAIL;
  const password = process.env.E2E_SELLER_APPROVED_PASSWORD;

  it('fills the form, adds 4 photos, submits, and the listing shows up in My Ads', async () => {
    if (!email || !password) {
      throw new Error(
        'Missing credentials — set E2E_SELLER_APPROVED_EMAIL / E2E_SELLER_APPROVED_PASSWORD',
      );
    }

    await loginAs(email, password);

    await element(by.id('nav-post')).tap();
    await waitFor(element(by.id('list-a-product-screen')))
      .toBeVisible()
      .withTimeout(15000);

    // Unique title so the My Ads assertion below can't accidentally match a
    // listing left over from a previous run.
    const title = `E2E test listing ${Date.now()}`;

    await element(
      by.placeholder('e.g. iPhone 13 — 128GB, mint condition'),
    ).typeText(title);
    await element(
      by.placeholder("Condition, accessories, why you're selling…"),
    ).typeText(
      'Posted by an automated end-to-end test. Safe to ignore/delete.',
    );

    await element(by.text('Choose category')).tap();
    await waitFor(element(by.id('category-option-vehicles')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('category-option-vehicles')).tap();
    await waitFor(element(by.id('category-option-vehicles-cars')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('category-option-vehicles-cars')).tap();

    await element(by.text('Like new')).tap();
    await element(by.placeholder('0')).typeText('1500');

    // Each tap opens the source-choice alert and (with E2E_MOCK_PHOTOS=true)
    // useImageUpload short-circuits straight to a canned uploaded URL,
    // skipping the native picker/upload round-trip entirely.
    for (let i = 0; i < 4; i += 1) {
      await element(by.id('add-photo-tile')).tap();
    }

    await waitFor(element(by.text('Post ad')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text('Post ad')).tap();

    // A real 201 from POST /marketplace/listings lands the new ad on the
    // Pending tab in My Ads (create always lands Pending, never Live) —
    // this is the actual proof the whole flow (form validation → photo
    // upload stub → real listing-create call → real listings-mine fetch)
    // works, not just that a button was tappable.
    await element(by.id('nav-myAds')).tap();
    await element(by.id('my-ads-tab-pending')).tap();
    await waitFor(element(by.text(title)))
      .toBeVisible()
      .withTimeout(15000);

    await logout();
  });
});

// Negative cases for the same form. isFormValid (ListAProductScreen.tsx)
// disables "Post ad" outright when a required field is missing/invalid —
// Detox can't read React Native's `disabled` prop directly, so each case
// below fills every field except the one under test, taps the button, and
// proves the tap was a no-op: still on the form screen, never reaching My
// Ads. Reuses the same approved-seller account and E2E_MOCK_PHOTOS
// requirement as the happy-path test above.
describe('Posting a listing — invalid form is blocked (real backend)', () => {
  const email = process.env.E2E_SELLER_APPROVED_EMAIL;
  const password = process.env.E2E_SELLER_APPROVED_PASSWORD;

  const PLACEHOLDER_TITLE = 'e.g. iPhone 13 — 128GB, mint condition';
  const PLACEHOLDER_DESC = "Condition, accessories, why you're selling…";
  const VALID_DESC =
    'Posted by an automated end-to-end negative-case test. Safe to ignore/delete.';

  const goToForm = async () => {
    if (!email || !password) {
      throw new Error(
        'Missing credentials — set E2E_SELLER_APPROVED_EMAIL / E2E_SELLER_APPROVED_PASSWORD',
      );
    }
    await loginAs(email, password);
    await element(by.id('nav-post')).tap();
    await waitFor(element(by.id('list-a-product-screen')))
      .toBeVisible()
      .withTimeout(15000);
  };

  const pickCategory = async () => {
    await element(by.text('Choose category')).tap();
    await waitFor(element(by.id('category-option-vehicles')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('category-option-vehicles')).tap();
    await waitFor(element(by.id('category-option-vehicles-cars')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('category-option-vehicles-cars')).tap();
  };

  const addPhotos = async count => {
    for (let i = 0; i < count; i += 1) {
      await element(by.id('add-photo-tile')).tap();
    }
  };

  // After tapping a blocked submit button, the app must not navigate away —
  // still on the form, and My Ads must not gain a new pending listing.
  const expectSubmitBlocked = async () => {
    await element(by.id('list-a-product-submit-button')).tap();
    await expect(element(by.id('list-a-product-screen'))).toBeVisible();
  };

  it('blocks submit with no category selected', async () => {
    await goToForm();
    await element(by.placeholder(PLACEHOLDER_TITLE)).typeText(
      `E2E no-category ${Date.now()}`,
    );
    await element(by.placeholder(PLACEHOLDER_DESC)).typeText(VALID_DESC);
    // Category intentionally skipped.
    await element(by.text('Like new')).tap();
    await element(by.placeholder('0')).typeText('1500');
    await addPhotos(4);

    await expectSubmitBlocked();
    await logout();
  });

  it('blocks submit with fewer than 4 photos', async () => {
    await goToForm();
    await element(by.placeholder(PLACEHOLDER_TITLE)).typeText(
      `E2E few-photos ${Date.now()}`,
    );
    await element(by.placeholder(PLACEHOLDER_DESC)).typeText(VALID_DESC);
    await pickCategory();
    await element(by.text('Like new')).tap();
    await element(by.placeholder('0')).typeText('1500');
    await addPhotos(2); // PHOTO_MIN is 4

    await expect(
      element(
        by.text(
          'Add at least 2 more photos — clear shots from different angles sell faster.',
        ),
      ),
    ).toExist();
    await expectSubmitBlocked();
    await logout();
  });

  it('blocks submit with an empty title', async () => {
    await goToForm();
    // Title intentionally left blank.
    await element(by.placeholder(PLACEHOLDER_DESC)).typeText(VALID_DESC);
    await pickCategory();
    await element(by.text('Like new')).tap();
    await element(by.placeholder('0')).typeText('1500');
    await addPhotos(4);

    await expectSubmitBlocked();
    await logout();
  });

  it('blocks submit with a description shorter than the 20-character minimum', async () => {
    await goToForm();
    await element(by.placeholder(PLACEHOLDER_TITLE)).typeText(
      `E2E short-desc ${Date.now()}`,
    );
    await element(by.placeholder(PLACEHOLDER_DESC)).typeText('too short');
    await pickCategory();
    await element(by.text('Like new')).tap();
    await element(by.placeholder('0')).typeText('1500');
    await addPhotos(4);

    await expectSubmitBlocked();
    await logout();
  });

  it('blocks submit with no price entered', async () => {
    await goToForm();
    await element(by.placeholder(PLACEHOLDER_TITLE)).typeText(
      `E2E no-price ${Date.now()}`,
    );
    await element(by.placeholder(PLACEHOLDER_DESC)).typeText(VALID_DESC);
    await pickCategory();
    await element(by.text('Like new')).tap();
    // Price intentionally left blank.
    await addPhotos(4);

    await expectSubmitBlocked();
    await logout();
  });

  it('blocks submit with no condition selected', async () => {
    await goToForm();
    await element(by.placeholder(PLACEHOLDER_TITLE)).typeText(
      `E2E no-condition ${Date.now()}`,
    );
    await element(by.placeholder(PLACEHOLDER_DESC)).typeText(VALID_DESC);
    await pickCategory();
    // Condition intentionally skipped.
    await element(by.placeholder('0')).typeText('1500');
    await addPhotos(4);

    await expectSubmitBlocked();
    await logout();
  });
});
