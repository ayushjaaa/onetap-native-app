const { element, by, waitFor } = require('detox');
const { loginAs, logout } = require('./helpers/login');

describe('Category browsing (Phase 4 — live backend categories)', () => {
  const email = process.env.E2E_BUYER_EMAIL;
  const password = process.env.E2E_BUYER_PASSWORD;

  beforeEach(async () => {
    if (!email || !password) {
      throw new Error(
        'Missing credentials — set E2E_BUYER_EMAIL / E2E_BUYER_PASSWORD',
      );
    }
    // init.js's beforeEach reloads the JS bundle before every test, which
    // resets navigation back to Home each time — so every test here starts
    // fresh from Home, not from wherever the previous test left off.
    await loginAs(email, password);
  });

  afterEach(async () => {
    await logout();
  });

  it('shows top categories on Home fetched from the real backend', async () => {
    await waitFor(element(by.id('home-category-grid')))
      .toBeVisible()
      .withTimeout(10000);

    await expect(element(by.id('category-card-electronics'))).toExist();
  });

  it('navigates to the full category list and shows the real tree', async () => {
    await element(by.id('see-all-categories')).tap();

    await waitFor(element(by.id('category-list-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await expect(element(by.id('category-row-properties'))).toExist();
    await expect(element(by.id('category-row-vehicles'))).toExist();
  });

  it('drills into a category and shows its real subcategories, not a generic placeholder set', async () => {
    // Navigate to the category list ourselves — the previous test's
    // navigation doesn't carry over since we reload+re-login every test.
    await element(by.id('see-all-categories')).tap();
    await waitFor(element(by.id('category-list-screen')))
      .toBeVisible()
      .withTimeout(10000);

    await element(by.id('category-row-vehicles')).tap();

    await waitFor(element(by.id('category-browse-screen')))
      .toBeVisible()
      .withTimeout(10000);

    // Regression check for the bug this phase fixes: subcategories must be
    // Vehicles' real children (Cars, Bikes, ...), not the old hardcoded
    // Smartphones/Tablets/Accessories/Wearables set shown for every category.
    await expect(element(by.id('subcategory-chip-vehicles-cars'))).toExist();
    await expect(element(by.text('Smartphones'))).not.toExist();
  });
});
