const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockGoBack = jest.fn();

const mockBaseRouteParams = {
  phone: '9876543210',
  user: { id: 'u1', email: 'a@test.com', name: 'A', role: 'user' },
  fromGoogle: false,
  needsLocation: false,
};
let mockRouteParams: Record<string, unknown> = mockBaseRouteParams;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: mockReset,
    goBack: mockGoBack,
  }),
  useRoute: () => ({ params: mockRouteParams }),
}));

// Mock mode skips the real verifyOtp API call so tests can exercise the
// post-verify session/token check in isolation.
jest.mock('@/config/env', () => ({
  env: { USE_MOCK_OTP: true },
}));

const mockVerifyOtp = jest.fn();
const mockResendOtp = jest.fn();
const mockUpdateProfile = jest.fn().mockReturnValue({
  unwrap: () => Promise.resolve({}),
});
jest.mock('@/api/authApi', () => ({
  useVerifyOtpMutation: () => [mockVerifyOtp],
  useResendOtpMutation: () => [mockResendOtp, { isLoading: false }],
  useUpdateProfileMutation: () => [mockUpdateProfile, { isLoading: false }],
}));

const mockGetToken = jest.fn();
jest.mock('@/services/secureStorage', () => ({
  secureStorage: {
    getToken: () => mockGetToken(),
    saveToken: jest.fn(),
  },
}));

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
jest.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    error: mockToastError,
    success: mockToastSuccess,
    info: jest.fn(),
    hide: jest.fn(),
  }),
}));

const mockDispatch = jest.fn();
jest.mock('@/hooks/useAppDispatch', () => ({
  useAppDispatch: () => mockDispatch,
}));

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  createTestStore,
  renderWithProviders,
} from '@/test-utils/renderWithProviders';
import { OtpScreen } from '@/screens/auth/OtpScreen';

// Pasting the full code into the first box exercises OtpInput's
// paste-handling branch and fills all boxes at once, which then
// auto-submits via the screen's own useEffect.
type GetByTestId = Awaited<
  ReturnType<typeof renderWithProviders>
>['getByTestId'];
const enterFullOtp = (getByTestId: GetByTestId) => {
  fireEvent.changeText(getByTestId('otp-box-0'), '123456');
};

describe('OtpScreen — session/token guard after verification', () => {
  beforeEach(() => {
    mockRouteParams = mockBaseRouteParams;
    mockGetToken.mockResolvedValue('valid-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to Welcome with a "Session expired" toast when the token is missing after verify', async () => {
    mockGetToken.mockResolvedValue(null);
    const store = createTestStore();

    const { getByTestId } = await renderWithProviders(<OtpScreen />, {
      store,
    });

    enterFullOtp(getByTestId);

    await new Promise(resolve => setTimeout(() => resolve(undefined), 0));

    expect(mockToastError).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Session expired' }),
    );
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
    // Must not fall through to the generic wrong-code handling.
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('redirects to Welcome when user is missing from route params, even if token exists', async () => {
    mockRouteParams = { ...mockBaseRouteParams, user: undefined };
    const store = createTestStore();

    const { getByTestId } = await renderWithProviders(<OtpScreen />, {
      store,
    });

    enterFullOtp(getByTestId);

    await new Promise(resolve => setTimeout(() => resolve(undefined), 0));

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  });

  it('does NOT redirect and logs the user in normally when token and user are both present', async () => {
    mockGetToken.mockResolvedValue('valid-token');
    const store = createTestStore();

    const { getByTestId } = await renderWithProviders(<OtpScreen />, {
      store,
    });

    enterFullOtp(getByTestId);

    await new Promise(resolve => setTimeout(() => resolve(undefined), 0));

    expect(mockReset).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ token: 'valid-token' }),
      }),
    );
  });
});
