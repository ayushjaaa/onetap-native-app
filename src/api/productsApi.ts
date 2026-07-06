import { baseApi } from './baseApi';
import type { ApiResponse } from '@/types/api.types';
import type {
  CreateListingRequest,
  CreateListingResponseData,
  DeleteListingResponseData,
  GetFeedParams,
  GetFeedResponseData,
  GetMyListingsResponseData,
  Listing,
} from '@/types';

export const productsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getFeed: builder.query<GetFeedResponseData, GetFeedParams>({
      query: params => ({
        url: '/marketplace/listings/feed',
        method: 'GET',
        params,
      }),
      transformResponse: (response: ApiResponse<GetFeedResponseData>) =>
        response.data,
      // Feed changes as sellers post/sell — short cache, not the 3600s used
      // for static reference data like categories.
      keepUnusedDataFor: 30,
      providesTags: result =>
        result
          ? [
              { type: 'Listing' as const, id: 'FEED' },
              ...result.listings.map(l => ({
                type: 'Listing' as const,
                id: l._id,
              })),
            ]
          : [{ type: 'Listing' as const, id: 'FEED' }],
    }),

    getMyListings: builder.query<GetMyListingsResponseData, void>({
      query: () => ({ url: '/marketplace/listings/mine', method: 'GET' }),
      transformResponse: (response: ApiResponse<GetMyListingsResponseData>) =>
        response.data,
      keepUnusedDataFor: 30,
      providesTags: result =>
        result
          ? [
              { type: 'Listing' as const, id: 'MINE' },
              ...result.listings.map(l => ({
                type: 'Listing' as const,
                id: l._id,
              })),
            ]
          : [{ type: 'Listing' as const, id: 'MINE' }],
    }),

    createListing: builder.mutation<
      CreateListingResponseData,
      CreateListingRequest
    >({
      query: body => ({
        url: '/marketplace/listings',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<CreateListingResponseData>) =>
        response.data,
      // Non-idempotent — a retried POST after a flaky response could create
      // a duplicate listing and silently consume a second slot.
      extraOptions: { maxRetries: 0 },
      invalidatesTags: [
        { type: 'Listing' as const, id: 'MINE' },
        { type: 'Listing' as const, id: 'FEED' },
      ],
    }),

    deleteListing: builder.mutation<DeleteListingResponseData, string>({
      query: id => ({
        url: `/marketplace/listings/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<DeleteListingResponseData>) =>
        response.data,
      invalidatesTags: (_result, _error, id) => [
        { type: 'Listing' as const, id },
        { type: 'Listing' as const, id: 'MINE' },
        { type: 'Listing' as const, id: 'FEED' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetFeedQuery,
  useGetMyListingsQuery,
  useCreateListingMutation,
  useDeleteListingMutation,
} = productsApi;

export type { Listing };
