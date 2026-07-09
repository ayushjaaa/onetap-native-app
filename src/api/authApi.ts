import { baseApi } from './baseApi';
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
  GoogleSignInRequest,
  GoogleSignInResponse,
  SetSellerTypeRequest,
  SetSellerTypeResponse,
  SubmitIndividualSellerProfileRequest,
  SubmitIndividualSellerProfileResponse,
} from '@/types';

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
      query: body => ({
        url: '/auth/phone/send-otp',
        method: 'POST',
        body,
      }),
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
  useSetSellerTypeMutation,
  useSubmitIndividualSellerProfileMutation,
} = authApi;
