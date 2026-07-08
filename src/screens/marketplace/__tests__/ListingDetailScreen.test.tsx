jest.mock('@/services/secureStorage');

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { ListingDetailScreen } from '@/screens/marketplace/ListingDetailScreen';
import { setCredentials } from '@/store/authSlice';

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
});
