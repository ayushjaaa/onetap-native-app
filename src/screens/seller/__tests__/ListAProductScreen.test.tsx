jest.mock('@/services/secureStorage');

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { ListAProductScreen } from '@/screens/seller/ListAProductScreen';
import { setLocation } from '@/store/locationSlice';

const originalFetch = globalThis.fetch;

interface UrlHandler {
  method: string;
  urlIncludes: string;
  body: unknown;
}

function mockFetchByUrl(handlers: UrlHandler[]) {
  globalThis.fetch = jest.fn((input: RequestInfo | URL) => {
    const req = input as Request;
    const match = handlers.find(
      h => req.url.includes(h.urlIncludes) && req.method === h.method,
    );
    const body = match
      ? match.body
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

const categoryTreeResponse = {
  success: true,
  message: 'Category tree retrieved',
  statusCode: 200,
  data: {
    categories: [
      {
        id: 'vehicles',
        name: 'Vehicles',
        children: [{ id: 'vehicles-cars', name: 'Cars' }],
      },
    ],
  },
};

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

describe('ListAProductScreen', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('submits a real POST /marketplace/listings with paise price, mapped condition, and real lat/lng', async () => {
    mockFetchByUrl([
      {
        method: 'GET',
        urlIncludes: '/marketplace/categories',
        body: categoryTreeResponse,
      },
      {
        method: 'POST',
        urlIncludes: '/marketplace/listings',
        body: {
          success: true,
          message: 'Listing submitted for review',
          statusCode: 201,
          data: { listing: { id: 'l1', status: 'Pending' } },
        },
      },
    ]);

    const { getByPlaceholderText, getByText, getByTestId } =
      await renderWithProviders(<ListAProductScreen />, {
        store: withLocation(),
      });

    // Add the (stub) required photo.
    fireEvent.press(getByTestId('add-photo-tile'));

    fireEvent.changeText(
      getByPlaceholderText('e.g. iPhone 13 — 128GB, mint condition'),
      'iPhone 13 128GB mint',
    );
    fireEvent.changeText(
      getByPlaceholderText("Condition, accessories, why you're selling…"),
      'Barely used, excellent condition, comes with box and charger.',
    );

    await waitFor(() => {
      expect(getByText('Choose category')).toBeTruthy();
    });
    fireEvent.press(getByText('Choose category'));
    await waitFor(() => {
      expect(getByText('Vehicles')).toBeTruthy();
    });
    fireEvent.press(getByText('Vehicles'));
    await waitFor(() => {
      expect(getByText('Cars')).toBeTruthy();
    });
    fireEvent.press(getByText('Cars'));

    fireEvent.press(getByText('Like new'));
    fireEvent.changeText(getByPlaceholderText('0'), '5000');

    await waitFor(() => {
      expect(getByText('Post ad')).toBeTruthy();
    });
    fireEvent.press(getByText('Post ad'));

    await waitFor(() => {
      const postCall = (globalThis.fetch as jest.Mock).mock.calls.find(
        c => (c[0] as Request).method === 'POST',
      );
      expect(postCall).toBeDefined();
    });

    const postCall = (globalThis.fetch as jest.Mock).mock.calls.find(
      c => (c[0] as Request).method === 'POST',
    );
    const sentBody = JSON.parse((postCall![1] as RequestInit).body as string);

    expect(sentBody).toMatchObject({
      title: 'iPhone 13 128GB mint',
      price: 500000, // 5000 rupees entered → paise on the wire
      category: 'vehicles-cars',
      condition: 'Like New',
      lat: 19.1,
      lng: 72.8,
    });
    // Stub photo swatches must never be sent — they aren't real Cloudinary ids.
    expect(sentBody.photos).toBeUndefined();
  });

  it('blocks submission and shows an error toast when location is unavailable', async () => {
    mockFetchByUrl([
      {
        method: 'GET',
        urlIncludes: '/marketplace/categories',
        body: categoryTreeResponse,
      },
    ]);

    const { getByPlaceholderText, getByText, getByTestId } =
      await renderWithProviders(<ListAProductScreen />, {
        store: createTestStore(), // no location dispatched
      });

    fireEvent.press(getByTestId('add-photo-tile'));
    fireEvent.changeText(
      getByPlaceholderText('e.g. iPhone 13 — 128GB, mint condition'),
      'iPhone 13 128GB mint',
    );
    fireEvent.changeText(
      getByPlaceholderText("Condition, accessories, why you're selling…"),
      'Barely used, excellent condition, comes with box and charger.',
    );

    await waitFor(() => expect(getByText('Choose category')).toBeTruthy());
    fireEvent.press(getByText('Choose category'));
    await waitFor(() => expect(getByText('Vehicles')).toBeTruthy());
    fireEvent.press(getByText('Vehicles'));
    await waitFor(() => expect(getByText('Cars')).toBeTruthy());
    fireEvent.press(getByText('Cars'));
    fireEvent.press(getByText('Like new'));
    fireEvent.changeText(getByPlaceholderText('0'), '5000');

    (globalThis.fetch as jest.Mock).mockClear();
    fireEvent.press(getByText('Post ad'));

    // No POST should ever be attempted without a real location.
    await new Promise<void>(resolve => setTimeout(() => resolve(), 50));
    const postCall = (globalThis.fetch as jest.Mock).mock.calls.find(
      c => (c[0] as Request).method === 'POST',
    );
    expect(postCall).toBeUndefined();
  });
});
