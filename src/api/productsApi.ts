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
  GetMyListingEditRequestsResponseData,
  GetMyListingsResponseData,
  GetTrendingParams,
  GetTrendingResponseData,
  GetTrendingSearchesParams,
  GetTrendingSearchesResponseData,
  Listing,
  ListingEditRequest,
  RevealPhoneResponse,
  SearchAutocompleteResponseData,
  SearchListingsParams,
  SearchListingsResponseData,
  CreateShareLinkResponseData,
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

    // Lazy, cache-first: only fires on an explicit "Call Seller" tap, and RTK
    // Query's normalized cache (keyed by listingId) means a repeat tap in the
    // same session reuses the cached number with no network call — matching
    // the backend's own per-(buyer,listing) dedupe.
    revealListingPhone: builder.query<
      RevealPhoneResponse,
      { listingId: string }
    >({
      query: ({ listingId }) => ({
        url: `/marketplace/listings/${listingId}/phone`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<RevealPhoneResponse>) =>
        response.data,
      extraOptions: { maxRetries: 0 },
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
        // Without this, getMyInterestsAsBuyer's cache never refreshes after a
        // successful express-interest call, so hasExpressedInterest goes stale
        // on remount and the CTA reappears as if the buyer never interested.
        { type: 'Listing' as const, id: 'INTERESTS_MINE' },
      ],
    }),

    getMyListings: builder.query<GetMyListingsResponseData, void>({
      query: () => ({ url: '/marketplace/listings/mine', method: 'GET' }),
      transformResponse: (response: ApiResponse<GetMyListingsResponseData>) => {
        if (__DEV__) {
          console.log(
            '[productsApi] getMyListings raw response:',
            JSON.stringify(response, null, 2),
          );
        }
        return response.data;
      },
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

    createListingEditRequest: builder.mutation<
      { editRequest: ListingEditRequest },
      { id: string; price: number; description: string }
    >({
      query: ({ id, price, description }) => ({
        url: `/marketplace/listings/${id}/edit-request`,
        method: 'POST',
        body: { price, description },
      }),
      transformResponse: (
        response: ApiResponse<{ editRequest: ListingEditRequest }>,
      ) => response.data,
      extraOptions: { maxRetries: 0 },
      // Deliberately does NOT invalidate the Listing tag — per the backend's
      // own contract, "nothing on the listing itself changes here — it only
      // takes effect once an admin approves it," so refetching the listing
      // here would just be a wasted round-trip for zero actual change.
      invalidatesTags: [{ type: 'EditRequest' as const, id: 'MINE' }],
    }),

    // No listingId filter param on the backend — every edit request the
    // seller has ever made, across all their listings, newest first. Callers
    // that need "the latest one for listing X" filter client-side (see
    // getLatestEditRequestForListing in utils/listingEditRequests.ts).
    getMyListingEditRequests: builder.query<
      GetMyListingEditRequestsResponseData,
      void
    >({
      query: () => ({
        url: '/marketplace/listings/edit-requests/mine',
        method: 'GET',
      }),
      transformResponse: (
        response: ApiResponse<GetMyListingEditRequestsResponseData>,
      ) => response.data,
      providesTags: [{ type: 'EditRequest' as const, id: 'MINE' }],
    }),

    createShareLink: builder.mutation<CreateShareLinkResponseData, string>({
      query: id => ({
        url: `/marketplace/listings/${id}/share`,
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<CreateShareLinkResponseData>) =>
        response.data,
    }),

    searchListings: builder.query<
      SearchListingsResponseData,
      SearchListingsParams
    >({
      query: params => ({
        url: '/marketplace/listings/search',
        method: 'GET',
        params,
      }),
      transformResponse: (response: ApiResponse<SearchListingsResponseData>) =>
        response.data,
      keepUnusedDataFor: 30,
      providesTags: result =>
        result
          ? [
              { type: 'Listing' as const, id: 'SEARCH' },
              ...result.listings.map(l => ({
                type: 'Listing' as const,
                id: l._id,
              })),
            ]
          : [{ type: 'Listing' as const, id: 'SEARCH' }],
    }),

    autocompleteSearch: builder.query<SearchAutocompleteResponseData, string>({
      query: q => ({
        url: '/marketplace/listings/search/autocomplete',
        method: 'GET',
        params: { q },
      }),
      transformResponse: (
        response: ApiResponse<SearchAutocompleteResponseData>,
      ) => response.data,
      keepUnusedDataFor: 15,
    }),

    getTrendingSearches: builder.query<
      GetTrendingSearchesResponseData,
      GetTrendingSearchesParams | void
    >({
      query: params => ({
        url: '/marketplace/listings/search/trending',
        method: 'GET',
        params: params ?? undefined,
      }),
      transformResponse: (
        response: ApiResponse<GetTrendingSearchesResponseData>,
      ) => {
        if (__DEV__) {
          console.log(
            '[productsApi] getTrendingSearches raw response:',
            JSON.stringify(response, null, 2),
          );
        }
        return response.data;
      },
      // Aggregate over a rolling window server-side — safe to cache a bit
      // longer than live listings data.
      keepUnusedDataFor: 300,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetFeedQuery,
  useGetTrendingListingsQuery,
  useGetListingQuery,
  useLazyRevealListingPhoneQuery,
  useExpressInterestMutation,
  useGetMyListingsQuery,
  useCreateListingMutation,
  useDeleteListingMutation,
  useCreateListingEditRequestMutation,
  useGetMyListingEditRequestsQuery,
  useCreateShareLinkMutation,
  useSearchListingsQuery,
  useAutocompleteSearchQuery,
  useGetTrendingSearchesQuery,
} = productsApi;

// getListing and getListingById used to be two separate endpoint definitions
// that both hit GET /marketplace/listings/:id — same network call, same cache
// key space, just two different response shapes ({ listing } vs listing
// directly) and two independent RTK Query cache entries for the same data.
// Consolidated onto the single real endpoint (useGetListingQuery); this wrapper
// keeps the old useGetListingByIdQuery name and its flat-Listing return shape
// working for existing callers (BuyerPurchaseHistoryScreen, SellerSalesHistoryScreen)
// without touching them, while sharing one cache entry instead of double-fetching.
export function useGetListingByIdQuery(
  ...args: Parameters<typeof useGetListingQuery>
): Omit<ReturnType<typeof useGetListingQuery>, 'data'> & {
  data: Listing | undefined;
} {
  const result = useGetListingQuery(...args);
  return { ...result, data: result.data?.listing };
}

export type { Listing };
