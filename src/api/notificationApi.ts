import { baseApi } from './baseApi';
import type { ApiResponse } from '@/types/api.types';
import type {
  GetNotificationsParams,
  GetNotificationsResponseData,
  GetUnreadCountResponseData,
  MarkAllReadResponseData,
  MarkReadResponseData,
  GetFeatureInterestsResponseData,
  FeatureInterestResponseData,
} from '@/types';

export const notificationApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getNotifications: builder.query<
      GetNotificationsResponseData,
      GetNotificationsParams | undefined
    >({
      query: params => ({ url: '/notification', method: 'GET', params }),
      transformResponse: (
        response: ApiResponse<GetNotificationsResponseData>,
      ) => response.data,
      keepUnusedDataFor: 30,
      providesTags: result =>
        result
          ? [
              { type: 'User' as const, id: 'NOTIFICATIONS' },
              ...result.notifications.map(n => ({
                type: 'User' as const,
                id: `NOTIFICATION_${n._id}`,
              })),
            ]
          : [{ type: 'User' as const, id: 'NOTIFICATIONS' }],
    }),

    getUnreadCount: builder.query<GetUnreadCountResponseData, void>({
      query: () => ({ url: '/notification/unread-count', method: 'GET' }),
      transformResponse: (response: ApiResponse<GetUnreadCountResponseData>) =>
        response.data,
      keepUnusedDataFor: 30,
      providesTags: [{ type: 'User' as const, id: 'UNREAD_COUNT' }],
    }),

    markAllNotificationsRead: builder.mutation<MarkAllReadResponseData, void>({
      query: () => ({ url: '/notification/mark-all-read', method: 'PATCH' }),
      transformResponse: (response: ApiResponse<MarkAllReadResponseData>) =>
        response.data,
      invalidatesTags: [
        { type: 'User' as const, id: 'NOTIFICATIONS' },
        { type: 'User' as const, id: 'UNREAD_COUNT' },
      ],
    }),

    markNotificationRead: builder.mutation<MarkReadResponseData, string>({
      query: id => ({ url: `/notification/${id}/read`, method: 'PATCH' }),
      transformResponse: (response: ApiResponse<MarkReadResponseData>) =>
        response.data,
      invalidatesTags: (_result, _error, id) => [
        { type: 'User' as const, id: 'NOTIFICATIONS' },
        { type: 'User' as const, id: 'UNREAD_COUNT' },
        { type: 'User' as const, id: `NOTIFICATION_${id}` },
      ],
    }),

    // "Notify me when this launches" — ComingSoonScreen's toggle.
    getFeatureInterests: builder.query<GetFeatureInterestsResponseData, void>({
      query: () => ({ url: '/notification/feature-interest', method: 'GET' }),
      transformResponse: (
        response: ApiResponse<GetFeatureInterestsResponseData>,
      ) => response.data,
      providesTags: [{ type: 'User' as const, id: 'FEATURE_INTERESTS' }],
    }),

    subscribeFeatureInterest: builder.mutation<
      FeatureInterestResponseData,
      string
    >({
      query: featureKey => ({
        url: '/notification/feature-interest',
        method: 'POST',
        body: { featureKey },
      }),
      transformResponse: (response: ApiResponse<FeatureInterestResponseData>) =>
        response.data,
      invalidatesTags: [{ type: 'User' as const, id: 'FEATURE_INTERESTS' }],
    }),

    unsubscribeFeatureInterest: builder.mutation<
      FeatureInterestResponseData,
      string
    >({
      query: featureKey => ({
        url: `/notification/feature-interest/${featureKey}`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<FeatureInterestResponseData>) =>
        response.data,
      invalidatesTags: [{ type: 'User' as const, id: 'FEATURE_INTERESTS' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useGetFeatureInterestsQuery,
  useSubscribeFeatureInterestMutation,
  useUnsubscribeFeatureInterestMutation,
} = notificationApi;
