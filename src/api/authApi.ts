import type { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { baseApi } from './baseApi';
import { setUser } from '@/store/authSlice';
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
  ResendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  ForgotPasswordSendOtpRequest,
  ForgotPasswordSendOtpResponse,
  ForgotPasswordVerifyOtpRequest,
  ForgotPasswordVerifyOtpResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  GoogleSignInRequest,
  GoogleSignInResponse,
  SetSellerTypeRequest,
  SetSellerTypeResponse,
  SubmitIndividualSellerProfileRequest,
  SubmitIndividualSellerProfileResponse,
} from '@/types';

// RTK Query only auto-refetches queries that have an active subscriber —
// `getMe` has none (it's only ever `.initiate()`-d once, in useBootstrap), so
// `invalidatesTags: ['User']` alone never updates `state.auth.user` after a
// seller mutation. Force the refetch here and push the result into Redux so
// `isSellerApproved`/`aadhaarVerified` (derived in authSlice) stay current
// within the same session, not just after the next app relaunch.
const refreshUserAfter = async (
  queryFulfilled: Promise<unknown>,
  dispatch: ThunkDispatch<unknown, unknown, AnyAction>,
): Promise<void> => {
  try {
    await queryFulfilled;
    const result = await dispatch(
      authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }),
    ).unwrap();
    dispatch(setUser(result.data.user));
  } catch {
    // Mutation itself failed — caller already surfaces that error to the user.
  }
};

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

    sendOtp: builder.mutation<SendOtpResponse, SendOtpRequest>({
      query: body => {
        console.log('[sendOtp] request body:', body);
        return {
          url: '/auth/phone/send-otp',
          method: 'POST',
          body,
        };
      },
    }),

    resendOtp: builder.mutation<ResendOtpResponse, void>({
      query: () => ({
        url: '/auth/phone/resend-otp',
        method: 'POST',
      }),
    }),

    verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpRequest>({
      query: body => ({
        url: '/auth/phone/verify-otp',
        method: 'POST',
        body,
      }),
    }),

    forgotPasswordSendOtp: builder.mutation<
      ForgotPasswordSendOtpResponse,
      ForgotPasswordSendOtpRequest
    >({
      query: body => ({
        url: '/auth/forgot-password/send-otp',
        method: 'POST',
        body,
      }),
    }),

    forgotPasswordVerifyOtp: builder.mutation<
      ForgotPasswordVerifyOtpResponse,
      ForgotPasswordVerifyOtpRequest
    >({
      query: body => ({
        url: '/auth/forgot-password/verify-otp',
        method: 'POST',
        body,
      }),
    }),

    resetPassword: builder.mutation<
      ResetPasswordResponse,
      ResetPasswordRequest
    >({
      query: body => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),

    setSellerType: builder.mutation<
      SetSellerTypeResponse,
      SetSellerTypeRequest
    >({
      query: body => ({
        url: '/auth/me/seller',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['User'],
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await refreshUserAfter(queryFulfilled, dispatch);
      },
    }),

    submitIndividualSellerProfile: builder.mutation<
      SubmitIndividualSellerProfileResponse,
      SubmitIndividualSellerProfileRequest
    >({
      query: body => ({
        url: '/auth/seller/individual',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await refreshUserAfter(queryFulfilled, dispatch);
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
  useResendOtpMutation,
  useVerifyOtpMutation,
  useForgotPasswordSendOtpMutation,
  useForgotPasswordVerifyOtpMutation,
  useResetPasswordMutation,
  useSetSellerTypeMutation,
  useSubmitIndividualSellerProfileMutation,
} = authApi;
