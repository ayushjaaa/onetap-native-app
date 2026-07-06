const { device, element, by, waitFor } = require('detox');

describe('Category browsing (Phase 4 — live backend categories)', () => {
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
