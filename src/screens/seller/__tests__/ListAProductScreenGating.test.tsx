// Focused on the mount-time self-guard added to ListAProductScreen (redirect
// away if !isSellerApproved) — kept separate from ListAProductScreen.test.tsx
// (which drives the real submit flow and is currently skipped/broken for
// unrelated reasons: react-native-image-picker's jest transform and an
// RNTL+Modal interaction quirk, see that file's own notes).

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace }),
}));

jest.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ pick: jest.fn(), isUploading: false }),
}));

jest.mock('@/hooks/useLocation', () => ({
  useLocation: () => ({
    status: 'idle',
    location: null,
    error: null,
    refining: false,
    fetch: jest.fn(() => Promise.resolve(null)),
  }),
}));

jest.mock('@/api/categoriesApi', () => ({
  useGetCategoryTreeQuery: () => ({ data: [], isLoading: false }),
}));

jest.mock('@/api/productsApi', () => ({
  useCreateListingMutation: () => [jest.fn(), { isLoading: false }],
  useGetMyListingsQuery: () => ({
    data: { summary: { slotsRemaining: 3 } },
    isLoading: false,
  }),
}));

import React from 'react';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { ListAProductScreen } from '@/screens/seller/ListAProductScreen';
import { setUser } from '@/store/authSlice';

describe('ListAProductScreen — mount-time self-guard (defense in depth)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects away immediately if an unapproved user somehow lands here directly', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u1',
        email: 'seller@test.com',
        name: 'Test Seller',
        role: 'user',
        sellerType: 'individual',
        sellerDisplayName: 'Test Store',
        // No identity:kyc_verified permission — not actually approved,
        // regardless of how navigation got them here.
      } as never),
    );

    await renderWithProviders(<ListAProductScreen />, { store });

    expect(mockReplace).toHaveBeenCalledWith('BecomeSellerIntro');
  });

  it('redirects a logged-out/no-user state to BecomeSellerIntro too', async () => {
    const store = createTestStore();

    await renderWithProviders(<ListAProductScreen />, { store });

    expect(mockReplace).toHaveBeenCalledWith('BecomeSellerIntro');
  });

  it('does not redirect an approved seller — the form stays up', async () => {
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

    const { getByText } = await renderWithProviders(<ListAProductScreen />, {
      store,
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(getByText('Post ad')).toBeTruthy();
  });
});
