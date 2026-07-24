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
import { fireEvent } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { setUser } from '@/store/authSlice';

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
