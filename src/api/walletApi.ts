import { baseApi } from './baseApi';
import type { ApiResponse } from '@/types/api.types';
import type {
  GetPackagesResponseData,
  GetWalletResponseData,
  GetWalletTransactionReceiptResponseData,
  GetWalletTransactionsParams,
  GetWalletTransactionsResponseData,
  InitiatePackagePurchaseRequest,
  InitiatePackagePurchaseResponseData,
  VerifyPaymentRequest,
  VerifyPaymentResponseData,
} from '@/types';

export const walletApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getWallet: builder.query<GetWalletResponseData, void>({
      query: () => ({ url: '/wallet', method: 'GET' }),
      transformResponse: (response: ApiResponse<GetWalletResponseData>) =>
        response.data,
      keepUnusedDataFor: 30,
      providesTags: [{ type: 'Wallet' as const, id: 'BALANCE' }],
    }),

    getWalletTransactions: builder.query<
      GetWalletTransactionsResponseData,
      GetWalletTransactionsParams | undefined
    >({
      query: params => ({
        url: '/wallet/transactions',
        method: 'GET',
        params,
      }),
      transformResponse: (
        response: ApiResponse<GetWalletTransactionsResponseData>,
      ) => response.data,
      keepUnusedDataFor: 30,
      providesTags: [{ type: 'Wallet' as const, id: 'TRANSACTIONS' }],
    }),

    getWalletTransactionReceipt: builder.query<
      GetWalletTransactionReceiptResponseData,
      string
    >({
      query: id => ({
        url: `/wallet/transactions/${id}/receipt`,
        method: 'GET',
      }),
      transformResponse: (
        response: ApiResponse<GetWalletTransactionReceiptResponseData>,
      ) => response.data,
      keepUnusedDataFor: 30,
      providesTags: (_result, _error, id) => [
        { type: 'Wallet' as const, id: `RECEIPT_${id}` },
      ],
    }),

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
      // A successful purchase changes postSlots/postCredits and appends a
      // ledger row — invalidate the listings "MINE" summary (for MyAdsScreen/
      // ListAProductScreen) and the wallet balance/transactions (for
      // ProductWalletScreen) so they all refetch the new state.
      invalidatesTags: [
        { type: 'Listing' as const, id: 'MINE' },
        { type: 'Wallet' as const, id: 'BALANCE' },
        { type: 'Wallet' as const, id: 'TRANSACTIONS' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetWalletQuery,
  useGetWalletTransactionsQuery,
  useGetWalletTransactionReceiptQuery,
  useGetPackagesQuery,
  useInitiatePackagePurchaseMutation,
  useVerifyPaymentMutation,
} = walletApi;
