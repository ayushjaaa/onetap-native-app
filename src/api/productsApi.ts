import { baseApi } from './baseApi';
import type { ApiResponse } from '@/types/api.types';
import type {
  CreateListingRequest,
  CreateListingResponseData,
  DeleteListingResponseData,
  ExpressInterestRequest,
  ExpressInterestResponseData,
  GetFeedParams,
  GetFeedResponseData,
  GetListingResponseData,
  GetMyListingsResponseData,
  GetTrendingParams,
  GetTrendingResponseData,
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

    getTrendingListings: builder.query<
      GetTrendingResponseData,
      GetTrendingParams
    >({
      query: params => ({
        url: '/marketplace/listings/trending',
        method: 'GET',
        params,
      }),
      transformResponse: (response: ApiResponse<GetTrendingResponseData>) =>
        response.data,
      // Same rationale as the feed cache — trending shifts as interests/boosts land.
      keepUnusedDataFor: 30,
      providesTags: result =>
        result
          ? [
              { type: 'Listing' as const, id: 'TRENDING' },
              ...result.listings.map(l => ({
                type: 'Listing' as const,
                id: l._id,
              })),
            ]
          : [{ type: 'Listing' as const, id: 'TRENDING' }],
    }),

    getListing: builder.query<GetListingResponseData, string>({
      query: id => ({ url: `/marketplace/listings/${id}`, method: 'GET' }),
      transformResponse: (response: ApiResponse<GetListingResponseData>) =>
        response.data,
      providesTags: (_result, _error, id) => [{ type: 'Listing' as const, id }],
    }),

    expressInterest: builder.mutation<
      ExpressInterestResponseData,
      ExpressInterestRequest
    >({
      query: ({ listingId, message }) => ({
        url: `/marketplace/listings/${listingId}/interest`,
        method: 'POST',
        body: { message },
      }),
      transformResponse: (response: ApiResponse<ExpressInterestResponseData>) =>
        response.data,
      // Non-idempotent on the network layer (though the backend itself upserts
      // on listingId+buyerId) — avoid a silent double-fire on retry.
      extraOptions: { maxRetries: 0 },
      invalidatesTags: (_result, _error, { listingId }) => [
        { type: 'Listing' as const, id: listingId },
      ],
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
  useGetTrendingListingsQuery,
  useGetListingQuery,
  useExpressInterestMutation,
  useGetMyListingsQuery,
  useCreateListingMutation,
  useDeleteListingMutation,
} = productsApi;

export type { Listing };
