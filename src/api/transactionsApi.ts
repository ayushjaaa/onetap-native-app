import { baseApi } from './baseApi';
import type { ApiResponse } from '@/types/api.types';
import type {
  GetInterestsParams,
  GetInterestsResponseData,
  GetTransactionsParams,
  GetTransactionsResponseData,
  SelectBuyerResponseData,
} from '@/types';

export const transactionsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getMyInterestsAsBuyer: builder.query<
      GetInterestsResponseData,
      GetInterestsParams | undefined
    >({
      query: params => ({
        url: '/marketplace/interests/mine',
        method: 'GET',
        params,
      }),
      transformResponse: (response: ApiResponse<GetInterestsResponseData>) =>
        response.data,
      keepUnusedDataFor: 30,
      providesTags: [{ type: 'Listing' as const, id: 'INTERESTS_MINE' }],
    }),

    getMyTransactions: builder.query<
      GetTransactionsResponseData,
      GetTransactionsParams | undefined
    >({
      query: params => ({
        url: '/marketplace/transactions/mine',
        method: 'GET',
        params,
      }),
      transformResponse: (response: ApiResponse<GetTransactionsResponseData>) =>
        response.data,
      keepUnusedDataFor: 30,
      providesTags: (_result, _error, params) => [
        {
          type: 'Listing' as const,
          id: `TRANSACTIONS_${params?.role ?? 'buyer'}`,
        },
      ],
    }),

    selectBuyer: builder.mutation<
      SelectBuyerResponseData,
      { interestId: string; listingId: string }
    >({
      query: ({ interestId }) => ({
        url: `/marketplace/interests/${interestId}/select`,
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<SelectBuyerResponseData>) =>
        response.data,
      extraOptions: { maxRetries: 0 },
      // Marks the listing Sold and resolves every pending interest on it —
      // refresh the listing itself, the seller's received-interests list
      // (interestsApi's tag, not this file's — that's the query actually
      // used for the seller-received view), their listings summary, and
      // both transaction histories.
      invalidatesTags: (_result, _error, { listingId }) => [
        { type: 'Listing' as const, id: listingId },
        { type: 'Interest' as const, id: 'RECEIVED' },
        { type: 'Listing' as const, id: 'MINE' },
        { type: 'Listing' as const, id: 'TRANSACTIONS_seller' },
        { type: 'Listing' as const, id: 'TRANSACTIONS_buyer' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyInterestsAsBuyerQuery,
  useGetMyTransactionsQuery,
  useSelectBuyerMutation,
} = transactionsApi;
