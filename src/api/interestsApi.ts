import { baseApi } from './baseApi';
import type { ApiResponse } from '@/types/api.types';
import type { GetReceivedInterestsResponseData } from '@/types';

export const interestsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getReceivedInterests: builder.query<GetReceivedInterestsResponseData, void>(
      {
        query: () => ({
          url: '/marketplace/interests/received',
          method: 'GET',
        }),
        transformResponse: (
          response: ApiResponse<GetReceivedInterestsResponseData>,
        ) => response.data,
        // Buyers can express interest at any time — don't let this go stale for long
        // while a seller is sitting on the listing detail screen.
        keepUnusedDataFor: 30,
        providesTags: [{ type: 'Interest' as const, id: 'RECEIVED' }],
      },
    ),
  }),
  overrideExisting: false,
});

export const { useGetReceivedInterestsQuery } = interestsApi;
