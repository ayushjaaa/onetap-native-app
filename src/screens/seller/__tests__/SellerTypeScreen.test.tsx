const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockPopToTop = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
    popToTop: mockPopToTop,
  }),
}));

const mockSetSellerType = jest.fn(() => ({
  unwrap: () => Promise.resolve({}),
}));
jest.mock('@/api/authApi', () => ({
  useSetSellerTypeMutation: () => [mockSetSellerType],
}));

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { SellerTypeScreen } from '@/screens/seller/SellerTypeScreen';
import { setUser } from '@/store/authSlice';

// These three scenarios simulate a stale nav-stack entry — e.g. the user
// hardware-backs onto this screen after already progressing further, or a
// deep link lands here directly. The screen must self-heal by redirecting
// rather than let them re-register or see a stale step.
describe('SellerTypeScreen — defensive redirect for stale navigation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('pops to top if the user is already an approved seller', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u1',
        email: 'a@test.com',
        name: 'A',
        role: 'user',
        permissions: ['identity:kyc_verified'],
      } as never),
    );

    await renderWithProviders(<SellerTypeScreen />, { store });

    expect(mockPopToTop).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('resumes at IndividualOnboarding if sellerType is set but the profile is not submitted', async () => {
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

    await renderWithProviders(<SellerTypeScreen />, { store });

    expect(mockReplace).toHaveBeenCalledWith('IndividualOnboarding');
    expect(mockPopToTop).not.toHaveBeenCalled();
  });

  it('resumes at BecomeSellerIntro if the profile is already submitted (registered, pending approval)', async () => {
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

    await renderWithProviders(<SellerTypeScreen />, { store });

    expect(mockReplace).toHaveBeenCalledWith('BecomeSellerIntro');
  });

  it('does not redirect a fresh user with no sellerType yet — lets them pick', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u4',
        email: 'd@test.com',
        name: 'D',
        role: 'user',
      } as never),
    );

    const { getByText } = await renderWithProviders(<SellerTypeScreen />, {
      store,
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPopToTop).not.toHaveBeenCalled();
    expect(getByText('Individual seller')).toBeTruthy();
  });
});

describe('SellerTypeScreen — submission gating', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('tapping the Wholesale card never submits or navigates — it is a Phase 2 stub', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u5',
        email: 'e@test.com',
        name: 'E',
        role: 'user',
      } as never),
    );

    const { getByText } = await renderWithProviders(<SellerTypeScreen />, {
      store,
    });

    fireEvent.press(getByText('Wholesale seller'));

    expect(mockSetSellerType).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
