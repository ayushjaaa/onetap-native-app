jest.mock('@/services/secureStorage');

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { ComingSoonScreen } from '@/screens/coming-soon/ComingSoonScreen';
import { setCredentials } from '@/store/authSlice';

const originalFetch = globalThis.fetch;

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

const withSession = () => {
  const store = createTestStore();
  store.dispatch(
    setCredentials({
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'user@test.com',
        role: 'user',
      },
      token: 'test-token',
    }),
  );
  return store;
};

const routeFor = (featureKey: 'service' | 'bid' | 'sip') => ({
  key: 'ComingSoon-test',
  name: 'ComingSoon' as const,
  params: { featureKey },
});

describe('ComingSoonScreen', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('reflects an existing subscription as the switch already on', async () => {
    mockFetchByUrl({
      '/feature-interest': { success: true, data: { featureKeys: ['bid'] } },
    });

    const { getByRole } = await renderWithProviders(
      <ComingSoonScreen route={routeFor('bid')} navigation={{} as never} />,
      { store: withSession() },
    );

    await waitFor(() => {
      expect(getByRole('switch').props.value).toBe(true);
    });
  });

  it('calls POST /feature-interest when toggling on for a feature with no existing subscription', async () => {
    mockFetchByUrl({
      '/feature-interest': { success: true, data: { featureKeys: [] } },
    });

    const { getByRole } = await renderWithProviders(
      <ComingSoonScreen route={routeFor('sip')} navigation={{} as never} />,
      { store: withSession() },
    );

    await waitFor(() => {
      expect(getByRole('switch').props.value).toBe(false);
    });
    fireEvent(getByRole('switch'), 'valueChange', true);

    await waitFor(() => {
      const calls = (globalThis.fetch as jest.Mock).mock.calls;
      const call = calls.find((c: any[]) => {
        const req = c[0] as Request;
        return req.url?.includes('/feature-interest') && req.method === 'POST';
      });
      expect(call).toBeDefined();
    });
  });
});
