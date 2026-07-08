import { baseApi } from './baseApi';
import type { ApiResponse } from '@/types/api.types';
import type { PickedImage } from '@/services/imagePicker';

interface UploadAvatarResult {
  avatarUrl: string;
}

interface UploadListingImageResult {
  url: string;
}

function toFormData(image: PickedImage): FormData {
  const formData = new FormData();
  // React Native's fetch/FormData accepts this {uri, name, type} shape directly —
  // it's a documented RN-specific extension, not a real Blob/File.
  formData.append('file', {
    uri: image.uri,
    name: image.name,
    type: image.type,
  } as unknown as Blob);
  return formData;
}

export const uploadApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    uploadAvatarImage: builder.mutation<UploadAvatarResult, PickedImage>({
      query: image => ({
        url: '/auth/avatar/upload',
        method: 'POST',
        body: toFormData(image),
      }),
      transformResponse: (response: ApiResponse<UploadAvatarResult>) =>
        response.data,
      extraOptions: { maxRetries: 0 },
    }),

    uploadListingImage: builder.mutation<UploadListingImageResult, PickedImage>(
      {
        query: image => ({
          url: '/marketplace/listings/upload',
          method: 'POST',
          body: toFormData(image),
        }),
        transformResponse: (response: ApiResponse<UploadListingImageResult>) =>
          response.data,
        extraOptions: { maxRetries: 0 },
      },
    ),
  }),
  overrideExisting: false,
});

export const { useUploadAvatarImageMutation, useUploadListingImageMutation } =
  uploadApi;
