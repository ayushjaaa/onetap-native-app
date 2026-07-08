import { baseApi } from './baseApi';
import type { ApiResponse } from '@/types/api.types';
import type {
  GetNotificationsResponseData,
  GetUnreadCountResponseData,
  MarkAllReadResponseData,
  MarkReadResponseData,
} from '@/types';

export const notificationApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getNotifications: builder.query<GetNotificationsResponseData, void>({
      query: () => ({ url: '/notification', method: 'GET' }),
      transformResponse: (
        response: ApiResponse<GetNotificationsResponseData>,
      ) => response.data,
      providesTags: [{ type: 'Notification' as const, id: 'LIST' }],
    }),

    getUnreadCount: builder.query<GetUnreadCountResponseData, void>({
      query: () => ({ url: '/notification/unread-count', method: 'GET' }),
      transformResponse: (response: ApiResponse<GetUnreadCountResponseData>) =>
        response.data,
      providesTags: [{ type: 'Notification' as const, id: 'UNREAD_COUNT' }],
    }),

    markNotificationRead: builder.mutation<MarkReadResponseData, string>({
      query: id => ({ url: `/notification/${id}/read`, method: 'PATCH' }),
      transformResponse: (response: ApiResponse<MarkReadResponseData>) =>
        response.data,
      invalidatesTags: [
        { type: 'Notification' as const, id: 'LIST' },
        { type: 'Notification' as const, id: 'UNREAD_COUNT' },
      ],
    }),

    markAllNotificationsRead: builder.mutation<MarkAllReadResponseData, void>({
      query: () => ({ url: '/notification/mark-all-read', method: 'PATCH' }),
      transformResponse: (response: ApiResponse<MarkAllReadResponseData>) =>
        response.data,
      invalidatesTags: [
        { type: 'Notification' as const, id: 'LIST' },
        { type: 'Notification' as const, id: 'UNREAD_COUNT' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationApi;
