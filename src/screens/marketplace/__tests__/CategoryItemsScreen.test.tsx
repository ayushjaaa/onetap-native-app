jest.mock('@/services/secureStorage');

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { CategoryItemsScreen } from '@/screens/marketplace/CategoryItemsScreen';
import { setLocation } from '@/store/locationSlice';

const originalFetch = globalThis.fetch;

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

const routeFor = (
  categoryId: string,
  categoryName: string,
  subcategoryId?: string,
) => ({
  key: 'CategoryItems-test',
  name: 'CategoryItems' as const,
  params: { category: { id: categoryId, name: categoryName }, subcategoryId },
});

const withLocation = () => {
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
  return store;
};

describe('CategoryItemsScreen', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('with "All" selected, scopes listings to this category\'s subtree client-side', async () => {
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

    const { getByText, queryByText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <CategoryItemsScreen route={routeFor('vehicles', 'Vehicles')} />,
      { store: withLocation() },
    );

    await waitFor(() => {
      expect(getByText('A car')).toBeTruthy();
    });
    expect(queryByText('A sofa')).toBeNull();
  });

  it('honors an initial subcategoryId from route params by scoping the feed request itself', async () => {
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

    await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <CategoryItemsScreen
        route={routeFor('vehicles', 'Vehicles', 'vehicles-cars')}
      />,
      { store: withLocation() },
    );

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

  it('tapping a subcategory tab scopes the feed request server-side', async () => {
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

    const { getByTestId } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <CategoryItemsScreen route={routeFor('vehicles', 'Vehicles')} />,
      { store: withLocation() },
    );

    await waitFor(() => {
      expect(getByTestId('subcategory-tab-vehicles-cars')).toBeTruthy();
    });

    (globalThis.fetch as jest.Mock).mockClear();
    fireEvent.press(getByTestId('subcategory-tab-vehicles-cars'));

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

  it('shows the empty state when no items match', async () => {
    mockCategoriesAndFeedByUrl(
      [{ id: 'vehicles', name: 'Vehicles', children: [] }],
      [],
    );

    const { getByText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <CategoryItemsScreen route={routeFor('vehicles', 'Vehicles')} />,
      { store: withLocation() },
    );

    await waitFor(() => {
      expect(getByText('No items found')).toBeTruthy();
    });
  });
});
