const mockNavigate = jest.fn();
const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace }),
  // Real behavior re-registers the BackHandler listener whenever `state`
  // changes (it's a useCallback dep) — running the callback like a normal
  // effect, instead of no-op'ing it, is what lets the back-button tests
  // below observe that registration.
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb),
}));

jest.mock('react-native-razorpay', () => ({
  open: jest.fn(() =>
    Promise.resolve({
      razorpay_order_id: 'order_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'sig_1',
    }),
  ),
}));

const mockInitiatePurchase = jest.fn(() => ({
  unwrap: () =>
    Promise.resolve({
      package: { id: 'p1', name: 'Starter', postCredits: 5 },
      currency: 'INR',
      keyId: 'key_1',
      amount: 49900,
      razorpayOrderId: 'order_1',
    }),
}));
const mockVerifyPayment = jest.fn(() => ({
  unwrap: () => Promise.resolve({ status: 'paid' }),
}));

jest.mock('@/api/walletApi', () => ({
  useInitiatePackagePurchaseMutation: () => [mockInitiatePurchase],
  useVerifyPaymentMutation: () => [mockVerifyPayment],
}));

import React from 'react';
import { BackHandler } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { PaymentResultScreen } from '@/screens/seller/PaymentResultScreen';
import { setUser } from '@/store/authSlice';

const baseRoute = { params: { packageId: 'p1' } } as never;

const sellerStore = () => {
  const store = createTestStore();
  store.dispatch(
    setUser({
      id: 'u1',
      email: 'seller@test.com',
      name: 'Test Seller',
      role: 'user',
    } as never),
  );
  return store;
};

// The most recently registered 'hardwareBackPress' handler — mirrors what
// Android would actually invoke on a real back-button press.
const latestBackHandler = () => {
  const calls = (BackHandler.addEventListener as jest.Mock).mock.calls;
  const last = [...calls].reverse().find(c => c[0] === 'hardwareBackPress');
  return last![1] as () => boolean;
};

describe('PaymentResultScreen — "List your first product" gating', () => {
  beforeEach(() => {
    jest.spyOn(BackHandler, 'addEventListener');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sends a paid-but-unapproved seller to BecomeSellerIntro, not straight to ListProduct', async () => {
    const store = createTestStore();
    store.dispatch(
      setUser({
        id: 'u1',
        email: 'seller@test.com',
        name: 'Test Seller',
        role: 'user',
        sellerType: 'individual',
        sellerDisplayName: 'Test Store',
        // No identity:kyc_verified permission — a package purchase alone
        // never grants approval (see postAdRouter.ts).
      } as never),
    );

    const { getByText } = await renderWithProviders(
      <PaymentResultScreen route={baseRoute} navigation={{} as never} />,
      { store },
    );

    await waitFor(() =>
      expect(getByText('List your first product')).toBeTruthy(),
    );
    fireEvent.press(getByText('List your first product'));

    expect(mockReplace).toHaveBeenCalledWith('BecomeSellerIntro');
    expect(mockReplace).not.toHaveBeenCalledWith('ListProduct');
  });

  it('sends an approved seller straight to ListProduct', async () => {
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

    const { getByText } = await renderWithProviders(
      <PaymentResultScreen route={baseRoute} navigation={{} as never} />,
      { store },
    );

    await waitFor(() =>
      expect(getByText('List your first product')).toBeTruthy(),
    );
    fireEvent.press(getByText('List your first product'));

    expect(mockReplace).toHaveBeenCalledWith('ListProduct');
  });

  it('blocks the hardware back button while a successful purchase is showing', async () => {
    const { getByText } = await renderWithProviders(
      <PaymentResultScreen route={baseRoute} navigation={{} as never} />,
      { store: sellerStore() },
    );

    await waitFor(() =>
      expect(getByText('List your first product')).toBeTruthy(),
    );

    // true = event handled/suppressed, matching Android's
    // hardwareBackPress contract — the user must use the on-screen buttons.
    expect(latestBackHandler()()).toBe(true);
  });

  it('allows the hardware back button once payment has failed', async () => {
    mockVerifyPayment.mockReturnValueOnce({
      unwrap: () => Promise.resolve({ status: 'failed' }),
    });

    const { getByText } = await renderWithProviders(
      <PaymentResultScreen route={baseRoute} navigation={{} as never} />,
      { store: sellerStore() },
    );

    await waitFor(() =>
      expect(getByText("Payment didn't go through")).toBeTruthy(),
    );

    expect(latestBackHandler()()).toBe(false);
  });
});
