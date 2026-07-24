import { baseApi } from './baseApi';
import type { ApiResponse } from '@/types/api.types';
import type {
  AddFavoriteResponseData,
  RemoveFavoriteResponseData,
  GetMyFavoritesResponseData,
} from '@/types';

export const favoritesApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getMyFavorites: builder.query<GetMyFavoritesResponseData, void>({
      query: () => ({ url: '/marketplace/me/favorites', method: 'GET' }),
      transformResponse: (response: ApiResponse<GetMyFavoritesResponseData>) =>
        response.data,
      providesTags: result =>
        result?.favorites
          ? [
              { type: 'Listing' as const, id: 'FAVORITES' },
              ...result.favorites.map(l => ({
                type: 'Listing' as const,
                id: `FAV_${l._id}`,
              })),
            ]
          : [{ type: 'Listing' as const, id: 'FAVORITES' }],
    }),

    addFavorite: builder.mutation<AddFavoriteResponseData, string>({
      query: listingId => ({
        url: `/marketplace/listings/${listingId}/favorite`,
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<AddFavoriteResponseData>) =>
        response.data,
      extraOptions: { maxRetries: 0 },
      invalidatesTags: (_result, _error, listingId) => [
        { type: 'Listing' as const, id: 'FAVORITES' },
        { type: 'Listing' as const, id: `FAV_${listingId}` },
      ],
    }),

    removeFavorite: builder.mutation<RemoveFavoriteResponseData, string>({
      query: listingId => ({
        url: `/marketplace/listings/${listingId}/favorite`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<RemoveFavoriteResponseData>) =>
        response.data,
      extraOptions: { maxRetries: 0 },
      invalidatesTags: (_result, _error, listingId) => [
        { type: 'Listing' as const, id: 'FAVORITES' },
        { type: 'Listing' as const, id: `FAV_${listingId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} = favoritesApi;
