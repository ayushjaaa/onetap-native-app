jest.mock('@/services/secureStorage');

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { MyAdsScreen } from '@/screens/profile/MyAdsScreen';

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

function mockMyListings(
  listings: unknown[],
  summaryOverrides: Record<string, unknown> = {},
) {
  mockFetchOnce({
    success: true,
    message: 'Seller listings retrieved',
    statusCode: 200,
    data: {
      listings,
      summary: {
        total: listings.length,
        active: listings.length,
        postSlots: 3,
        slotsUsed: listings.length,
        slotsRemaining: 3 - listings.length,
        kycStatus: 'pending',
        ...summaryOverrides,
      },
    },
  });
}

describe('MyAdsScreen', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('shows live listings by default (default active tab)', async () => {
    mockMyListings([
      makeListing({ _id: 'l1', title: 'Live phone', status: 'Live' }),
      makeListing({ _id: 'l2', title: 'Pending sofa', status: 'Pending' }),
    ]);

    const { getByText, queryByText } = await renderWithProviders(
      <MyAdsScreen />,
    );

    await waitFor(() => {
      expect(getByText('Live phone')).toBeTruthy();
    });
    expect(queryByText('Pending sofa')).toBeNull();
  });

  it('folds Expired listings into the Rejected tab with distinct copy', async () => {
    mockMyListings([
      makeListing({ _id: 'l1', title: 'Expired bike', status: 'Expired' }),
    ]);

    const { getByText } = await renderWithProviders(<MyAdsScreen />);

    await waitFor(() => {
      expect(getByText(/Rejected/)).toBeTruthy();
    });
    fireEvent.press(getByText(/Rejected/));

    await waitFor(() => {
      expect(getByText('Expired bike')).toBeTruthy();
      expect(
        getByText('Listing expired — repost to make it live again.'),
      ).toBeTruthy();
    });
  });

  it('excludes soft-deleted listings entirely from every tab', async () => {
    mockMyListings([
      makeListing({ _id: 'l1', title: 'Deleted item', status: 'Deleted' }),
    ]);

    const { queryByText } = await renderWithProviders(<MyAdsScreen />);

    await waitFor(() => {
      expect(queryByText('Deleted item')).toBeNull();
    });
  });

  it('shows the real slotsRemaining from the backend summary, not a hardcoded value', async () => {
    mockMyListings([makeListing({ _id: 'l1', status: 'Live' })], {
      slotsRemaining: 2,
    });

    const { getByText } = await renderWithProviders(<MyAdsScreen />);

    await waitFor(() => {
      expect(getByText('2 slots · Wallet')).toBeTruthy();
    });
  });

  it('removing a listing calls the real delete mutation', async () => {
    mockMyListings([
      makeListing({ _id: 'l1', title: 'Live phone', status: 'Live' }),
    ]);

    const { getByText } = await renderWithProviders(<MyAdsScreen />);

    await waitFor(() => {
      expect(getByText('Live phone')).toBeTruthy();
    });

    // Alert.alert is native and doesn't render in RNTL — spy on it and
    // immediately invoke the destructive "Remove" action's onPress.
    const alertSpy = jest
      .spyOn(require('react-native').Alert, 'alert')
      .mockImplementation((_title, _msg, buttons) => {
        const removeBtn = (
          buttons as Array<{ text: string; onPress?: () => void }>
        ).find(b => b.text === 'Remove');
        removeBtn?.onPress?.();
      });

    mockMyListings([]);
    fireEvent.press(getByText('Remove'));

    await waitFor(() => {
      const calledUrls = (globalThis.fetch as jest.Mock).mock.calls.map(
        c => (c[0] as Request).url,
      );
      expect(calledUrls.some(u => u.includes('/marketplace/listings/l1'))).toBe(
        true,
      );
    });

    alertSpy.mockRestore();
  });
});
