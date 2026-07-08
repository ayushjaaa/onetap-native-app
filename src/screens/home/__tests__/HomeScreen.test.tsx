jest.mock('@/services/secureStorage');

import React from 'react';
import { waitFor } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { setLocation } from '@/store/locationSlice';

const originalFetch = globalThis.fetch;

function mockFetchByUrl(handlers: Record<string, unknown>) {
  globalThis.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const match = Object.keys(handlers).find(key => url.includes(key));
    const body = match
      ? handlers[match]
      : { success: true, message: '', statusCode: 200, data: {} };
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

const emptyCategoriesResponse = {
  success: true,
  message: 'Top categories retrieved',
  statusCode: 200,
  data: { categories: [] },
};

describe('HomeScreen trending (live feed)', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('does not call the feed endpoint until a location is available', async () => {
    mockFetchByUrl({
      '/marketplace/categories/top': emptyCategoriesResponse,
    });

    const store = createTestStore();
    await renderWithProviders(<HomeScreen />, { store });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    const calledUrls = (globalThis.fetch as jest.Mock).mock.calls.map(
      c => (c[0] as Request).url,
    );
    expect(calledUrls.some(u => u.includes('/listings/trending'))).toBe(false);
  });

  it('fetches and renders the live feed once location is set', async () => {
    mockFetchByUrl({
      '/marketplace/categories/top': emptyCategoriesResponse,
      '/marketplace/listings/trending': {
        success: true,
        message: 'Trending listings retrieved',
        statusCode: 200,
        data: {
          listings: [
            {
              _id: 'l1',
              sellerId: 's1',
              title: 'iPhone 13 — 128GB',
              description: 'mint',
              price: 4200000,
              category: 'electronics-mobiles',
              condition: 'Like New',
              photos: [],
              location: { type: 'Point', coordinates: [72.8, 19.1] },
              status: 'Live',
              distanceMetres: 500,
              createdAt: '2026-07-01T00:00:00.000Z',
              updatedAt: '2026-07-01T00:00:00.000Z',
            },
          ],
        },
      },
    });

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

    const { getByText } = await renderWithProviders(<HomeScreen />, { store });

    await waitFor(() => {
      expect(getByText('iPhone 13 — 128GB')).toBeTruthy();
    });
  });

  it('shows the empty state when the feed returns no listings', async () => {
    mockFetchByUrl({
      '/marketplace/categories/top': emptyCategoriesResponse,
      '/marketplace/listings/trending': {
        success: true,
        message: 'Trending listings retrieved',
        statusCode: 200,
        data: { listings: [] },
      },
    });

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

    const { getByText } = await renderWithProviders(<HomeScreen />, { store });

    await waitFor(() => {
      expect(
        getByText('No trending listings yet — be the first to post!'),
      ).toBeTruthy();
    });
  });
});
