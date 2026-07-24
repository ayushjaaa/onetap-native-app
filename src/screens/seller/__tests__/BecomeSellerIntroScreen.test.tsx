const mockNavigate = jest.fn();
const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace }),
}));

const mockFetchMe = jest.fn();
jest.mock('@/api/authApi', () => ({
  useLazyGetMeQuery: () => [mockFetchMe, { isFetching: false }],
}));

jest.mock('@/api/walletApi', () => ({
  useGetWalletQuery: () => ({
    data: { wallet: { postCredits: 0 } },
    isLoading: false,
  }),
}));

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { BecomeSellerIntroScreen } from '@/screens/seller/BecomeSellerIntroScreen';
import { setUser } from '@/store/authSlice';

describe('BecomeSellerIntroScreen — resume/rejected gating', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('a fresh user sees "Get started" and it routes to SellerType', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u1',
        email: 'a@test.com',
        name: 'A',
        role: 'user',
      } as never),
    );

    const { getByText } = await renderWithProviders(
      <BecomeSellerIntroScreen />,
      { store },
    );

    fireEvent.press(getByText('Get started'));

    expect(mockNavigate).toHaveBeenCalledWith('SellerType');
  });

  it('a seller who picked a type but has not submitted a profile resumes at IndividualOnboarding', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u2',
        email: 'b@test.com',
        name: 'B',
        role: 'user',
        sellerType: 'individual',
      } as never),
    );

    const { getByText } = await renderWithProviders(
      <BecomeSellerIntroScreen />,
      { store },
    );

    fireEvent.press(getByText('Continue setup'));

    expect(mockNavigate).toHaveBeenCalledWith('IndividualOnboarding');
  });

  it('a seller with a submitted profile but no package yet resumes at PackageSelection', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u3',
        email: 'c@test.com',
        name: 'C',
        role: 'user',
        sellerType: 'individual',
        sellerDisplayName: 'C Store',
      } as never),
    );

    const { getByText } = await renderWithProviders(
      <BecomeSellerIntroScreen />,
      { store },
    );

    fireEvent.press(getByText('Continue setup'));

    expect(mockNavigate).toHaveBeenCalledWith('PackageSelection');
  });

  it('an approved seller is auto-redirected straight to ListProduct on mount', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u4',
        email: 'd@test.com',
        name: 'D',
        role: 'user',
        sellerType: 'individual',
        sellerDisplayName: 'D Store',
        permissions: ['identity:kyc_verified'],
      } as never),
    );

    await renderWithProviders(<BecomeSellerIntroScreen />, { store });

    expect(mockReplace).toHaveBeenCalledWith('ListProduct');
  });

  it('a rejected seller sees no CTA button at all — no in-app path back into onboarding', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u5',
        email: 'e@test.com',
        name: 'E',
        role: 'user',
        sellerType: 'individual',
        sellerDisplayName: 'E Store',
        kycStatus: 'rejected',
      } as never),
    );

    const { getByText, queryByText } = await renderWithProviders(
      <BecomeSellerIntroScreen />,
      { store },
    );

    expect(getByText(/no way to resubmit in-app/i)).toBeTruthy();
    // None of the CTA labels for any other stage should be present —
    // rejected has no button at all, so there's nothing to press.
    expect(queryByText('Get started')).toBeNull();
    expect(queryByText('Continue setup')).toBeNull();
    expect(queryByText('Check approval status')).toBeNull();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
