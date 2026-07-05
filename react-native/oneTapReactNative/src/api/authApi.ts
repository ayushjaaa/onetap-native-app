import { baseApi } from './baseApi';
import { env } from '@/config/env';
import { MOCK_OTP } from '@/config/constants';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  GoogleSignInRequest,
  GoogleSignInResponse,
} from '@/types';

const delay = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(() => resolve(), ms);
  });

export const authApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: body => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
    }),

    login: builder.mutation<LoginResponse, LoginRequest>({
      query: body => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    googleSignIn: builder.mutation<GoogleSignInResponse, GoogleSignInRequest>({
      query: body => ({
        url: '/auth/google',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    getMe: builder.query<MeResponse, void>({
      query: () => ({ url: '/auth/me', method: 'GET' }),
      providesTags: ['User'],
    }),

    updateProfile: builder.mutation<
      UpdateProfileResponse,
      UpdateProfileRequest
    >({
      query: body => ({
        url: '/auth/profile',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    /**
     * MOCK endpoint. Returns success after a small delay.
     * Backend not yet implemented — see AUTH_REQUIREMENTS.md §19.
     */
    sendOtp: builder.mutation<SendOtpResponse, SendOtpRequest>({
      queryFn: async arg => {
        if (env.USE_MOCK_OTP) {
          await delay(800);
          return {
            data: {
              success: true,
              message: `OTP sent to +91${arg.phone}`,
            },
          };
        }
        return {
          error: {
            status: 501,
            data: { message: 'Real OTP endpoint not implemented yet' },
          },
        };
      },
    }),

    /**
     * MOCK endpoint. Verifies against MOCK_OTP (1234).
     */
    verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpRequest>({
      queryFn: async arg => {
        if (env.USE_MOCK_OTP) {
          await delay(500);
          if (arg.otp === MOCK_OTP) {
            return {
              data: {
                success: true,
                verified: true,
                message: 'OTP verified',
              },
            };
          }
          return {
            error: {
              status: 400,
              data: { message: 'Invalid OTP. Please try again.' },
            },
          };
        }
        return {
          error: {
            status: 501,
            data: { message: 'Real OTP verify endpoint not implemented yet' },
          },
        };
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useGoogleSignInMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateProfileMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
} = authApi;
