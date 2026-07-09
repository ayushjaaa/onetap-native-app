jest.mock('@/services/secureStorage');

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { ListingDetailScreen } from '@/screens/marketplace/ListingDetailScreen';
import { setCredentials } from '@/store/authSlice';
import { setLocation } from '@/store/locationSlice';
import { getDistanceKm } from '@/utils/geo';

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

// Unlike mockFetchOnce (one canned body for every URL), this dispatches by
// URL substring — needed for tests where more than one endpoint fires
// (e.g. getMyFavorites alongside a favorite/unfavorite mutation).
function mockFetchByUrl(handlers: Record<string, unknown>) {
  globalThis.fetch = jest.fn().mockImplementation((input: Request | string) => {
    const url = typeof input === 'string' ? input : input.url;
    const match = Object.keys(handlers).find(pattern => url.includes(pattern));
    const body = match ? handlers[match] : { success: true, data: {} };
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
  sellerId: 'user-1',
  title: 'iPhone 13 128GB mint',
  description: 'Barely used, excellent condition, comes with box.',
  price: 500000,
  category: 'vehicles-cars',
  condition: 'Like New',
  photos: [],
  location: { type: 'Point', coordinates: [72.8, 19.1] },
  address: 'Andheri West, Mumbai',
  status: 'Pending',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

const routeFor = (listingId: string, listing?: unknown) => ({
  key: 'ListingDetail-test',
  name: 'ListingDetail' as const,
  params: { listingId, listing },
});

const withSellerSession = () => {
  const store = createTestStore();
  store.dispatch(
    setCredentials({
      user: {
        id: 'user-1',
        name: 'Test Seller',
        email: 'seller@test.com',
        role: 'user',
      },
      token: 'test-token',
    }),
  );
  return store;
};

describe('ListingDetailScreen', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('renders a Pending listing passed directly via navigation params, without hitting the network', async () => {
    const listing = makeListing({ status: 'Pending' });
    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const { getByText, queryByText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <ListingDetailScreen route={routeFor('l1', listing)} />,
      { store: withSellerSession() },
    );

    await waitFor(() => {
      expect(getByText('iPhone 13 128GB mint')).toBeTruthy();
    });
    expect(getByText('Pending admin review.')).toBeTruthy();
    // Confirms this didn't fall back to GET /listings/:id (which would
    // 404 for a Pending listing) — no fetch call should have been made.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(queryByText('Listing not found')).toBeNull();
  });

  it("shows the real rejection reason for a seller's Rejected listing", async () => {
    const listing = makeListing({
      status: 'Rejected',
      rejectionReason: 'Title contained a phone number.',
    });

    const { getByText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <ListingDetailScreen route={routeFor('l1', listing)} />,
      { store: withSellerSession() },
    );

    await waitFor(() => {
      expect(getByText('Rejected — see reason')).toBeTruthy();
    });
    fireEvent.press(getByText('Rejected — see reason'));

    await waitFor(() => {
      expect(getByText('Title contained a phone number.')).toBeTruthy();
    });
  });

  it('falls back to GET /listings/:id when no listing was passed via route params', async () => {
    const listing = makeListing({ status: 'Live' });
    mockFetchOnce({
      success: true,
      message: 'Listing retrieved',
      statusCode: 200,
      data: { listing },
    });

    const { getByText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <ListingDetailScreen route={routeFor('l1')} />,
      { store: withSellerSession() },
    );

    await waitFor(() => {
      expect(getByText('iPhone 13 128GB mint')).toBeTruthy();
    });
    const calledRequest = (globalThis.fetch as jest.Mock).mock
      .calls[0][0] as Request;
    expect(calledRequest.url).toContain('/marketplace/listings/l1');
  });

  it('shows the seller-mode menu button (not the buyer favorite/share icons) for an owned listing', async () => {
    const listing = makeListing({ status: 'Pending' });

    const { getByTestId } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <ListingDetailScreen route={routeFor('l1', listing)} />,
      { store: withSellerSession() },
    );

    await waitFor(() => {
      expect(getByTestId('listing-detail-menu-button')).toBeTruthy();
    });
  });

  it('does not show the seller-mode menu button for a listing owned by someone else', async () => {
    const listing = makeListing({ status: 'Live', sellerId: 'someone-else' });

    const { getByText, queryByTestId } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <ListingDetailScreen route={routeFor('l1', listing)} />,
      { store: withSellerSession() },
    );

    await waitFor(() => {
      expect(getByText('iPhone 13 128GB mint')).toBeTruthy();
    });
    expect(queryByTestId('listing-detail-menu-button')).toBeNull();
  });

  it('shows the seller distance when both the seller and the buyer have a location', async () => {
    const sellerCoords: [number, number] = [77.209, 28.6139]; // Delhi [lng, lat]
    const buyerLat = 19.076; // Mumbai
    const buyerLng = 72.8777;
    const listing = makeListing({
      status: 'Live',
      sellerId: 'someone-else',
      seller: {
        id: 'someone-else',
        name: 'Test Seller',
        isVerified: true,
        location: { type: 'Point', coordinates: sellerCoords },
      },
    });

    const store = withSellerSession();
    store.dispatch(
      setLocation({
        latitude: buyerLat,
        longitude: buyerLng,
        city: 'Mumbai',
        state: 'Maharashtra',
        address: null,
        pincode: null,
      }),
    );

    const { getByText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <ListingDetailScreen route={routeFor('l1', listing)} />,
      { store },
    );

    const expectedKm = Math.round(
      getDistanceKm(buyerLat, buyerLng, sellerCoords[1], sellerCoords[0]),
    );

    await waitFor(() => {
      expect(getByText(`${expectedKm} km away`)).toBeTruthy();
    });
  });

  it('does not show a seller distance when the buyer has no device location', async () => {
    const listing = makeListing({
      status: 'Live',
      sellerId: 'someone-else',
      seller: {
        id: 'someone-else',
        name: 'Test Seller',
        isVerified: true,
        location: { type: 'Point', coordinates: [77.209, 28.6139] },
      },
    });

    const { getByText, queryByText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <ListingDetailScreen route={routeFor('l1', listing)} />,
      { store: withSellerSession() },
    );

    await waitFor(() => {
      expect(getByText('iPhone 13 128GB mint')).toBeTruthy();
    });
    expect(queryByText(/km away/)).toBeNull();
  });

  it('shows the favorite icon as filled when the listing is already in favorites', async () => {
    const listing = makeListing({ status: 'Live', sellerId: 'someone-else' });
    mockFetchByUrl({
      '/me/favorites': {
        success: true,
        data: { favorites: [listing], total: 1, limit: 20, skip: 0 },
      },
    });

    const { getByLabelText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <ListingDetailScreen route={routeFor('l1', listing)} />,
      { store: withSellerSession() },
    );

    await waitFor(() => {
      expect(getByLabelText('Remove from favorites')).toBeTruthy();
    });
  });

  it('calls DELETE .../favorite when un-favoriting an already-favorited listing', async () => {
    const listing = makeListing({ status: 'Live', sellerId: 'someone-else' });
    mockFetchByUrl({
      '/me/favorites': {
        success: true,
        data: { favorites: [listing], total: 1, limit: 20, skip: 0 },
      },
      '/favorite': { success: true, data: { listingId: 'l1' } },
    });

    const { getByLabelText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <ListingDetailScreen route={routeFor('l1', listing)} />,
      { store: withSellerSession() },
    );

    await waitFor(() => {
      expect(getByLabelText('Remove from favorites')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('Remove from favorites'));

    await waitFor(() => {
      const calls = (globalThis.fetch as jest.Mock).mock.calls;
      const favoriteCall = calls.find((c: any[]) => {
        const url = typeof c[0] === 'string' ? c[0] : c[0]?.url;
        return url?.includes('/listings/l1/favorite');
      });
      expect(favoriteCall).toBeDefined();
      const req = favoriteCall![0] as Request;
      expect(req.method).toBe('DELETE');
      expect(req.url).toContain('/marketplace/listings/l1/favorite');
    });
  });

  it('calls POST .../favorite when favoriting a listing not yet in favorites', async () => {
    const listing = makeListing({ status: 'Live', sellerId: 'someone-else' });
    mockFetchByUrl({
      '/me/favorites': {
        success: true,
        data: { favorites: [], total: 0, limit: 20, skip: 0 },
      },
      '/favorite': { success: true, data: { listingId: 'l1' } },
    });

    const { getByLabelText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <ListingDetailScreen route={routeFor('l1', listing)} />,
      { store: withSellerSession() },
    );

    await waitFor(() => {
      expect(getByLabelText('Add to favorites')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('Add to favorites'));

    await waitFor(() => {
      const calls = (globalThis.fetch as jest.Mock).mock.calls;
      const favoriteCall = calls.find((c: any[]) => {
        const url = typeof c[0] === 'string' ? c[0] : c[0]?.url;
        return url?.includes('/listings/l1/favorite');
      });
      expect(favoriteCall).toBeDefined();
      const req = favoriteCall![0] as Request;
      expect(req.method).toBe('POST');
    });
  });

  it('generates a share link and invokes the native Share sheet', async () => {
    const shareSpy = jest
      .spyOn(require('react-native').Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' } as never);
    const listing = makeListing({ status: 'Live', sellerId: 'someone-else' });
    mockFetchByUrl({
      '/share': {
        success: true,
        data: { code: 'abc1234', url: 'onetap://listing/l1' },
      },
    });

    const { getByLabelText } = await renderWithProviders(
      // @ts-expect-error -- minimal route double, full navigation type not needed for this test
      <ListingDetailScreen route={routeFor('l1', listing)} />,
      { store: withSellerSession() },
    );

    await waitFor(() => {
      expect(getByLabelText('Share this listing')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('Share this listing'));

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'onetap://listing/l1' }),
      );
    });

    shareSpy.mockRestore();
  });
});
