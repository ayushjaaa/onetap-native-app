import { baseApi } from './baseApi';
import type { ApiResponse } from '@/types/api.types';
import type {
  GetPackagesResponseData,
  InitiatePackagePurchaseRequest,
  InitiatePackagePurchaseResponseData,
  VerifyPaymentRequest,
  VerifyPaymentResponseData,
} from '@/types';

export const walletApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getPackages: builder.query<GetPackagesResponseData, void>({
      query: () => ({ url: '/wallet/packages', method: 'GET' }),
      transformResponse: (response: ApiResponse<GetPackagesResponseData>) =>
        response.data,
      // Catalog is hardcoded server-side, effectively static.
      keepUnusedDataFor: 3600,
      providesTags: [{ type: 'Wallet' as const, id: 'PACKAGES' }],
    }),

    initiatePackagePurchase: builder.mutation<
      InitiatePackagePurchaseResponseData,
      InitiatePackagePurchaseRequest
    >({
      query: body => ({
        url: '/wallet/packages/purchase/initiate',
        method: 'POST',
        body,
      }),
      transformResponse: (
        response: ApiResponse<InitiatePackagePurchaseResponseData>,
      ) => response.data,
      // Non-idempotent — a retried POST would create a second Razorpay order.
      extraOptions: { maxRetries: 0 },
    }),

    verifyPayment: builder.mutation<
      VerifyPaymentResponseData,
      VerifyPaymentRequest
    >({
      query: body => ({
        url: '/wallet/payments/verify',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<VerifyPaymentResponseData>) =>
        response.data,
      extraOptions: { maxRetries: 0 },
      // A successful purchase changes postSlots — invalidate the listings
      // "MINE" summary so MyAdsScreen/ListAProductScreen refetch the new count.
      invalidatesTags: [{ type: 'Listing' as const, id: 'MINE' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPackagesQuery,
  useInitiatePackagePurchaseMutation,
  useVerifyPaymentMutation,
} = walletApi;
