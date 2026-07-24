jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('@/api/walletApi', () => ({
  useGetWalletQuery: () => ({
    data: { wallet: { postCredits: 3, biddingBalance: 0 } },
    isLoading: false,
  }),
  useGetWalletTransactionsQuery: () => ({
    data: { transactions: [] },
    isLoading: false,
  }),
  useGetWalletTransactionReceiptQuery: () => ({
    data: undefined,
    isFetching: false,
    isError: false,
  }),
}));

jest.mock('@/api/productsApi', () => ({
  useGetMyListingsQuery: () => ({
    data: { summary: { slotsRemaining: 3 } },
    isLoading: false,
  }),
}));

const mockNavigate = jest.fn();

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { ProductWalletScreen } from '@/screens/seller/ProductWalletScreen';
import { setUser } from '@/store/authSlice';

describe('ProductWalletScreen — post button gating', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('routes a paid-but-unapproved seller to BecomeSellerIntro, not straight to ListProduct', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u1',
        email: 'seller@test.com',
        name: 'Test Seller',
        role: 'user',
        sellerType: 'individual',
        sellerDisplayName: 'Test Store',
        // Package bought (postCredits > 0 via mocked wallet/listings above)
        // but never approved (no identity:kyc_verified permission) — the
        // real-world "paid up, still blocked" case postAdRouter.ts describes.
      } as never),
    );

    const { getByText } = await renderWithProviders(<ProductWalletScreen />, {
      store,
    });

    fireEvent.press(getByText('Post a product'));

    expect(mockNavigate).toHaveBeenCalledWith('BecomeSellerIntro');
    expect(mockNavigate).not.toHaveBeenCalledWith('ListProduct');
  });

  it('routes an approved seller straight to ListProduct', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u2',
        email: 'approved@test.com',
        name: 'Approved Seller',
        role: 'user',
        sellerType: 'individual',
        sellerDisplayName: 'Approved Store',
        permissions: ['identity:kyc_verified'],
      } as never),
    );

    const { getByText } = await renderWithProviders(<ProductWalletScreen />, {
      store,
    });

    fireEvent.press(getByText('Post a product'));

    expect(mockNavigate).toHaveBeenCalledWith('ListProduct');
  });
});
