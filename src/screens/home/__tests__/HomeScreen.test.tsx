jest.mock('@/services/secureStorage');

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { setUser } from '@/store/authSlice';
import { setLocation, setBrowsingLocation } from '@/store/locationSlice';
import { RADIUS_DEFAULT_KM } from '@/config/constants';

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

describe('HomeScreen — "Post an Ad" CTA gating', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('routes a mid-onboarding seller to IndividualOnboarding, not ListProduct', async () => {
    mockFetchByUrl({ '/marketplace/categories/top': emptyCategoriesResponse });

    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u1',
        email: 'seller@test.com',
        name: 'Test Seller',
        role: 'user',
        sellerType: 'individual',
        // No sellerDisplayName / permissions — mid-onboarding, unapproved.
      } as never),
    );

    const { getByText } = await renderWithProviders(<HomeScreen />, { store });

    fireEvent.press(getByText('Post an Ad'));

    expect(mockNavigate).toHaveBeenCalledWith('IndividualOnboarding');
    expect(mockNavigate).not.toHaveBeenCalledWith('ListProduct');
  });

  it('routes an approved seller straight to ListProduct', async () => {
    mockFetchByUrl({ '/marketplace/categories/top': emptyCategoriesResponse });

    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u2',
        email: 'approved@test.com',
        name: 'Approved Seller',
        role: 'user',
        permissions: ['identity:kyc_verified'],
      } as never),
    );

    const { getByText } = await renderWithProviders(<HomeScreen />, { store });

    fireEvent.press(getByText('Post an Ad'));

    expect(mockNavigate).toHaveBeenCalledWith('ListProduct');
  });
});

describe('HomeScreen — radius filter sheet applies to the correct mode', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  const MUMBAI = {
    latitude: 19.1,
    longitude: 72.8,
    city: 'Mumbai',
    state: 'Maharashtra',
    address: null,
    pincode: null,
  };

  const INDORE = {
    latitude: 22.7196,
    longitude: 75.8577,
    city: 'Indore',
    state: 'Madhya Pradesh',
    address: null,
    pincode: null,
  };

  // Opens the sheet, drags the slider to a new value, taps Apply — mirrors
  // how a real user would change the radius from Home.
  async function applyRadiusViaSheet(getByTestId: any, newRadiusKm: number) {
    fireEvent.press(getByTestId('home-radius-filter-button'));
    fireEvent(getByTestId('radius-filter-slider'), 'valueChange', newRadiusKm);
    fireEvent.press(getByTestId('radius-filter-apply-button'));
  }

  it('applying a new radius in real-GPS mode updates realLocationRadiusKm only, never browsingLocationRadiusKm', async () => {
    mockFetchByUrl({ '/marketplace/categories/top': emptyCategoriesResponse });

    const store = createTestStore();
    store.dispatch(setLocation(MUMBAI));
    // No browsingLocation set — isOverride is false, this is real-GPS mode.

    const { getByTestId } = await renderWithProviders(<HomeScreen />, {
      store,
    });

    expect(store.getState().location.browsingLocation).toBeNull();

    await applyRadiusViaSheet(getByTestId, 75);

    const state = store.getState().location;
    expect(state.realLocationRadiusKm).toBe(75);
    expect(state.browsingLocationRadiusKm).toBe(RADIUS_DEFAULT_KM);
  });

  it('applying a new radius in browsing mode updates browsingLocationRadiusKm only, never realLocationRadiusKm', async () => {
    mockFetchByUrl({ '/marketplace/categories/top': emptyCategoriesResponse });

    const store = createTestStore();
    store.dispatch(setLocation(MUMBAI));
    store.dispatch(setBrowsingLocation(INDORE)); // isOverride is now true.

    const { getByTestId } = await renderWithProviders(<HomeScreen />, {
      store,
    });

    await applyRadiusViaSheet(getByTestId, 120);

    const state = store.getState().location;
    expect(state.browsingLocationRadiusKm).toBe(120);
    // The real-GPS radius (Mumbai's) must stay untouched by an apply that
    // happened while browsing Indore — this is exactly the copy-paste-bug
    // shape this test exists to catch.
    expect(state.realLocationRadiusKm).toBe(RADIUS_DEFAULT_KM);
  });
});
