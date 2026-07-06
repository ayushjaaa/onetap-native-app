jest.mock('@/services/secureStorage');

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { CategoryBrowseScreen } from '@/screens/marketplace/CategoryBrowseScreen';
import { setLocation } from '@/store/locationSlice';

const originalFetch = globalThis.fetch;

function mockFetchOnce(body: unknown) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone() {
      return this;
    },
  }) as unknown as typeof fetch;
}

function mockCategoryTree(categories: unknown[]) {
  mockFetchOnce({
    success: true,
    message: 'Category tree retrieved',
    statusCode: 200,
    data: { categories },
  });
}

function mockCategoriesAndFeedByUrl(
  categories: unknown[],
  feedListings: unknown[],
) {
  globalThis.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const body = url.includes('/listings/feed')
      ? {
          success: true,
          message: 'Feed retrieved',
          statusCode: 200,
          data: { listings: feedListings, nextCursor: null, hasMore: false },
        }
      : {
          success: true,
          message: 'Category tree retrieved',
          statusCode: 200,
          data: { categories },
        };
    return Promise.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => body,
      text: async () => JSON.stringify(body),
      clone() {
        return this;
      },
    });
  }) as unknown as typeof fetch;
}

const makeListing = (overrides: Record<string, unknown> = {}) => ({
  _id: 'l1',
  sellerId: 's1',
  title: 'Test listing',
  description: 'desc',
  price: 100000,
  category: 'vehicles-cars',
  condition: 'Good',
  photos: [],
  location: { type: 'Point', coordinates: [72.8, 19.1] },
  status: 'Live',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

const routeFor = (categoryId: string, categoryName: string) => ({
  key: 'CategoryBrowse-test',
  name: 'CategoryBrowse' as const,
  params: { category: { id: categoryId, name: categoryName } },
});

describe('CategoryBrowseScreen', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("shows Vehicles' real subcategories, not the old generic Smartphones/Tablets/Accessories/Wearables set", async () => {
    mockCategoryTree([
      {
        id: 'vehicles',
        name: 'Vehicles',
        children: [
          { id: 'vehicles-cars', name: 'Cars' },
          { id: 'vehicles-bikes', name: 'Bikes' },
        ],
      },
      { id: 'properties', name: 'Properties', children: [] },
    ]);

    const { getByText, queryByText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <CategoryBrowseScreen route={routeFor('vehicles', 'Vehicles')} />,
    );

    await waitFor(() => {
      expect(getByText('Cars')).toBeTruthy();
      expect(getByText('Bikes')).toBeTruthy();
    });

    // Regression guard for the bug this phase fixes: this used to always
    // show the same 4 hardcoded subcategories regardless of which category
    // was tapped.
    expect(queryByText('Smartphones')).toBeNull();
    expect(queryByText('Tablets')).toBeNull();
  });

  it('shows a different subcategory set for a different category (proves it varies per-category)', async () => {
    mockCategoryTree([
      {
        id: 'properties',
        name: 'Properties',
        children: [{ id: 'properties-apartments', name: 'Apartments' }],
      },
    ]);

    const { getByText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <CategoryBrowseScreen route={routeFor('properties', 'Properties')} />,
    );

    await waitFor(() => {
      expect(getByText('Apartments')).toBeTruthy();
    });
  });

  it('always includes an "All" chip alongside the real subcategories', async () => {
    mockCategoryTree([
      {
        id: 'vehicles',
        name: 'Vehicles',
        children: [{ id: 'vehicles-cars', name: 'Cars' }],
      },
    ]);

    const { getByText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <CategoryBrowseScreen route={routeFor('vehicles', 'Vehicles')} />,
    );

    await waitFor(() => {
      expect(getByText('All')).toBeTruthy();
    });
  });

  it('with "All" selected, shows listings under this category\'s subtree and excludes listings from other categories', async () => {
    mockCategoriesAndFeedByUrl(
      [
        {
          id: 'vehicles',
          name: 'Vehicles',
          children: [{ id: 'vehicles-cars', name: 'Cars' }],
        },
      ],
      [
        makeListing({ _id: 'l1', title: 'A car', category: 'vehicles-cars' }),
        makeListing({
          _id: 'l2',
          title: 'A sofa',
          category: 'furniture-home-sofas',
        }),
      ],
    );

    const store = createTestStore();
    store.dispatch(
      setLocation({
        latitude: 19.1,
        longitude: 72.8,
        city: 'Mumbai',
        state: 'Maharashtra',
        address: null,
        pincode: null,
      }),
    );

    const { getByText, queryByText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <CategoryBrowseScreen route={routeFor('vehicles', 'Vehicles')} />,
      { store },
    );

    await waitFor(() => {
      expect(getByText('A car')).toBeTruthy();
    });
    // Client-side prefix scoping: the feed call itself has no category
    // filter when "All" is active (backend can't match "any child of X"),
    // so this assertion is the only thing proving cross-category leakage
    // doesn't reach the screen.
    expect(queryByText('A sofa')).toBeNull();
  });

  it('selecting a specific subcategory chip scopes the feed request itself, not just client-side', async () => {
    mockCategoriesAndFeedByUrl(
      [
        {
          id: 'vehicles',
          name: 'Vehicles',
          children: [{ id: 'vehicles-cars', name: 'Cars' }],
        },
      ],
      [makeListing({ _id: 'l1', title: 'A car', category: 'vehicles-cars' })],
    );

    const store = createTestStore();
    store.dispatch(
      setLocation({
        latitude: 19.1,
        longitude: 72.8,
        city: 'Mumbai',
        state: 'Maharashtra',
        address: null,
        pincode: null,
      }),
    );

    const { getByTestId } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <CategoryBrowseScreen route={routeFor('vehicles', 'Vehicles')} />,
      { store },
    );

    await waitFor(() => {
      expect(getByTestId('subcategory-chip-vehicles-cars')).toBeTruthy();
    });

    (globalThis.fetch as jest.Mock).mockClear();
    fireEvent.press(getByTestId('subcategory-chip-vehicles-cars'));

    await waitFor(() => {
      const calledUrls = (globalThis.fetch as jest.Mock).mock.calls.map(
        c => (c[0] as Request).url,
      );
      expect(
        calledUrls.some(
          u =>
            u.includes('/listings/feed') &&
            u.includes('category=vehicles-cars'),
        ),
      ).toBe(true);
    });
  });
});
