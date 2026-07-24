const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
    goBack: mockGoBack,
  }),
}));

jest.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ pick: jest.fn(), isUploading: false }),
}));

const mockSubmitProfile = jest.fn(() => ({
  unwrap: () => Promise.resolve({}),
}));
jest.mock('@/api/authApi', () => ({
  useSubmitIndividualSellerProfileMutation: () => [mockSubmitProfile],
}));

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { IndividualOnboardingScreen } from '@/screens/seller/IndividualOnboardingScreen';
import { setUser } from '@/store/authSlice';

const freshSellerStore = () => {
  const store = createTestStore();
  store.dispatch(
    setUser({
      id: 'u1',
      email: 'seller@test.com',
      name: 'Test Seller',
      role: 'user',
      sellerType: 'individual',
    } as never),
  );
  return store;
};

describe('IndividualOnboardingScreen — resubmission guard', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects away immediately if the profile is already submitted (e.g. hardware-back from PackageSelection)', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u2',
        email: 'seller2@test.com',
        name: 'Test Seller 2',
        role: 'user',
        sellerType: 'individual',
        sellerDisplayName: 'Already Submitted Store',
      } as never),
    );

    await renderWithProviders(<IndividualOnboardingScreen />, { store });

    expect(mockReplace).toHaveBeenCalledWith('BecomeSellerIntro');
  });

  it('does not redirect a fresh seller who has not submitted a profile yet', async () => {
    const { getByText } = await renderWithProviders(
      <IndividualOnboardingScreen />,
      { store: freshSellerStore() },
    );

    expect(mockReplace).not.toHaveBeenCalled();
    expect(getByText('Activate seller account')).toBeTruthy();
  });
});

describe('IndividualOnboardingScreen — submit gating', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('blocks submission until name, bio, photo, and a category are all provided', async () => {
    const { getByText, getByPlaceholderText } = await renderWithProviders(
      <IndividualOnboardingScreen />,
      { store: freshSellerStore() },
    );

    // Nothing filled in yet — pressing submit must be a no-op.
    fireEvent.press(getByText('Activate seller account'));
    expect(mockSubmitProfile).not.toHaveBeenCalled();

    // Name + bio alone still isn't enough — photo and category are required
    // too (see `canSubmit` in IndividualOnboardingScreen.tsx).
    fireEvent.changeText(
      getByPlaceholderText('Enter your seller name'),
      'My Store',
    );
    fireEvent.changeText(
      getByPlaceholderText(
        'What do you sell? Where? Anything buyers should know.',
      ),
      'Selling gently used electronics.',
    );
    fireEvent.press(getByText('Activate seller account'));

    expect(mockSubmitProfile).not.toHaveBeenCalled();
  });
});
