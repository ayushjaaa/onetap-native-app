jest.mock('@/services/secureStorage');

import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { CategoryListScreen } from '@/screens/marketplace/CategoryListScreen';

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

describe('CategoryListScreen', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('renders the real category tree from the backend, not the old hardcoded 11-item stub', async () => {
    mockFetchOnce({
      success: true,
      message: 'Category tree retrieved',
      statusCode: 200,
      data: {
        categories: [
          { id: 'properties', name: 'Properties', children: [] },
          { id: 'vehicles', name: 'Vehicles', children: [] },
        ],
      },
    });

    const { getByText, queryByText } = await renderWithProviders(
      <CategoryListScreen />,
    );

    await waitFor(() => {
      expect(getByText('Properties')).toBeTruthy();
      expect(getByText('Vehicles')).toBeTruthy();
    });

    // Regression guard: the removed stub always rendered "Mobiles" first —
    // it must not still be here now that this screen is backend-driven.
    expect(queryByText('Mobiles')).toBeNull();
  });

  it('shows a loading state before the category tree resolves', async () => {
    globalThis.fetch = jest.fn(
      () => new Promise(() => {}),
    ) as unknown as typeof fetch;

    const { queryByText } = await renderWithProviders(<CategoryListScreen />);

    expect(queryByText('Properties')).toBeNull();
  });
});
