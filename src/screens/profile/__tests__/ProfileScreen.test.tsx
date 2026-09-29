jest.mock('@/services/secureStorage');

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Pulls in react-native-image-picker via the real hook, which this repo's
// jest transformIgnorePatterns doesn't cover (see ListAProductScreen.test.tsx)
// — mock it out rather than touch the shared jest config for one screen.
jest.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ pick: jest.fn(), isUploading: false }),
}));

// Same story for @react-native-google-signin/google-signin, pulled in via
// googleAuth.ts's signOut() call on the logout path — not exercised here.
jest.mock('@/services/googleAuth', () => ({
  googleAuth: { signOut: jest.fn() },
}));

import React from 'react';
import { Alert, Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { setCredentials, setUser } from '@/store/authSlice';

describe('ProfileScreen — "Finish seller setup" gating', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resumes a mid-onboarding seller at IndividualOnboarding, not ListProduct', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u1',
        email: 'seller@test.com',
        name: 'Test Seller',
        role: 'user',
        sellerType: 'individual',
        // aadhaarVerified derives to true from sellerType alone, and
        // isSellerApproved stays false — exactly the state that shows the
        // "Finish seller setup" row (see ProfileScreen.tsx's
        // showFinishSellerSetup).
      } as never),
    );

    const { getByText } = await renderWithProviders(<ProfileScreen />, {
      store,
    });

    fireEvent.press(getByText('Finish seller setup'));

    expect(mockNavigate).toHaveBeenCalledWith('IndividualOnboarding');
    expect(mockNavigate).not.toHaveBeenCalledWith('ListProduct');
  });

  it('hides "Finish seller setup" once the seller is approved', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u2',
        email: 'approved@test.com',
        name: 'Approved Seller',
        role: 'user',
        sellerType: 'individual',
        permissions: ['identity:kyc_verified'],
      } as never),
    );

    const { queryByText } = await renderWithProviders(<ProfileScreen />, {
      store,
    });

    expect(queryByText('Finish seller setup')).toBeNull();
  });
});

describe('ProfileScreen — account deletion & support', () => {
  const originalFetch = globalThis.fetch;

  const loggedInStore = () => {
    const store = createTestStore();
    store.dispatch(
      setCredentials({
        token: 'test-token',
        user: {
          id: 'u9',
          email: 'buyer@test.com',
          name: 'Buyer',
          role: 'user',
        } as never,
      }),
    );
    return store;
  };

  const mockFetch = (status: number, body: unknown) => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => body,
      text: async () => JSON.stringify(body),
      clone() {
        return this;
      },
    }) as unknown as typeof fetch;
  };

  // Presses the destructive button of the Alert the screen just raised.
  const confirmAlert = async () => {
    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)[2];
    await buttons.find((b: any) => b.style === 'destructive').onPress();
  };

  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('calls DELETE /auth/account and signs out once it succeeds', async () => {
    mockFetch(200, {
      success: true,
      data: { userId: 'u9', isActive: false, deactivatedAt: '2026-09-28' },
    });
    const store = loggedInStore();
    const { getByTestId } = await renderWithProviders(<ProfileScreen />, {
      store,
    });

    await fireEvent.press(getByTestId('profile-delete-account-button'));
    await confirmAlert();

    await waitFor(() => expect(store.getState().auth.isLoggedIn).toBe(false));
    const req = (globalThis.fetch as jest.Mock).mock.calls[0][0] as Request;
    expect(req.method).toBe('DELETE');
    expect(req.url).toContain('/auth/account');
  });

  it('keeps the user signed in when the delete request fails', async () => {
    mockFetch(500, { success: false, message: 'boom' });
    const store = loggedInStore();
    const { getByTestId } = await renderWithProviders(<ProfileScreen />, {
      store,
    });

    await fireEvent.press(getByTestId('profile-delete-account-button'));
    await confirmAlert();

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(store.getState().auth.isLoggedIn).toBe(true);
  });

  it('dials the support number from "Call support"', async () => {
    const openURL = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);
    const { getByTestId } = await renderWithProviders(<ProfileScreen />, {
      store: loggedInStore(),
    });

    await fireEvent.press(getByTestId('profile-support-button'));

    expect(openURL).toHaveBeenCalledWith('tel:+918951773889');
  });
});
