import { baseApi } from './baseApi';
import type {
  CategoryNode,
  GetCategoryTreeResponse,
  GetTopCategoriesResponse,
} from '@/types';

const CATEGORY_CACHE_SECONDS = 60 * 60; // static reference data, avoid re-fetching all session

export const categoriesApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getCategoryTree: builder.query<CategoryNode[], void>({
      query: () => ({ url: '/marketplace/categories', method: 'GET' }),
      transformResponse: (response: GetCategoryTreeResponse) =>
        response.data.categories,
      keepUnusedDataFor: CATEGORY_CACHE_SECONDS,
      providesTags: result =>
        result
          ? [
              { type: 'Category' as const, id: 'TREE' },
              ...result.map(c => ({ type: 'Category' as const, id: c.id })),
            ]
          : [{ type: 'Category' as const, id: 'TREE' }],
    }),

    getTopCategories: builder.query<CategoryNode[], void>({
      query: () => ({ url: '/marketplace/categories/top', method: 'GET' }),
      transformResponse: (response: GetTopCategoriesResponse) => {
        console.log(
          '[categoriesApi] getTopCategories raw response (typeof=' +
            typeof response +
            '):',
          response,
        );
        return response?.data?.categories ?? [];
      },
      keepUnusedDataFor: CATEGORY_CACHE_SECONDS,
      providesTags: [{ type: 'Category' as const, id: 'TOP' }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetCategoryTreeQuery, useGetTopCategoriesQuery } =
  categoriesApi;
