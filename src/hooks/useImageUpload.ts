import {
  pickImageFromCamera,
  pickImagesFromLibrary,
  promptImageSource,
  ImagePickerPermissionError,
  ALLOWED_IMAGE_TYPES,
  type PickedImage,
} from '@/services/imagePicker';
import {
  useUploadAvatarImageMutation,
  useUploadListingImageMutation,
} from '@/api/uploadApi';
import { useToast } from '@/hooks/useToast';
import { mapApiError } from '@/utils/errorMapper';
import { env } from '@/config/env';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';

export type UploadTarget = 'avatar' | 'listing';

const UNSUPPORTED_FORMAT_MESSAGE =
  'Only JPEG, PNG, or WebP photos are supported.';

// A canned, already-"uploaded" server-relative path — same shape
// uploadAvatar/uploadListing would normally return. There's no real file
// behind it, only used when E2E_MOCK_PHOTOS is set (see env.ts), so
// POST /marketplace/listings still gets a real, valid-looking photos array
// without needing a real device photo library or a real upload round-trip.
const mockUploadedUrl = () => `/media/e2e-fixtures/photo-${Date.now()}.jpg`;

/**
 * Shared pick-then-upload flow for both the avatar picker (ProfileScreen,
 * IndividualOnboardingScreen) and the listing photo grid (ListAProductScreen) —
 * one place owning the camera/gallery prompt + network call + error toast.
 */
export function useImageUpload(target: UploadTarget) {
  const toast = useToast();
  const [uploadAvatar, avatarState] = useUploadAvatarImageMutation();
  const [uploadListing, listingState] = useUploadListingImageMutation();
  const isUploading =
    target === 'avatar' ? avatarState.isLoading : listingState.isLoading;

  const uploadOne = async (
    image: PickedImage,
  ): Promise<{ url: string } | { error: string }> => {
    try {
      if (target === 'avatar') {
        const result = await uploadAvatar(image).unwrap();
        return { url: result.avatarUrl };
      }
      const result = await uploadListing(image).unwrap();
      return { url: result.url };
    } catch (err) {
      console.warn(`[useImageUpload] upload failed for ${image.name}:`, err);
      return {
        error: mapApiError(err as FetchBaseQueryError | SerializedError)
          .message,
      };
    }
  };

  /**
   * `maxCount` caps how many photos the library picker lets the user
   * multi-select in one go — pass remaining slots (e.g. PHOTO_MAX -
   * photos.length) for the listing photo grid. Defaults to 1 (single
   * select), which is always correct for avatar upload. Camera capture is
   * always exactly one photo regardless of maxCount.
   */
  const pick = async (maxCount = 1): Promise<string[]> => {
    if (env.E2E_MOCK_PHOTOS) return [mockUploadedUrl()];

    let images: PickedImage[];
    try {
      const source = await promptImageSource();
      if (!source) return [];

      images =
        source === 'camera'
          ? await pickImageFromCamera().then(img => (img ? [img] : []))
          : await pickImagesFromLibrary(maxCount);
    } catch (err) {
      if (err instanceof ImagePickerPermissionError) {
        toast.error({
          title: 'Permission needed',
          message: 'Allow camera/photo access in Settings to add photos.',
        });
      } else {
        console.warn('[useImageUpload] picker failed:', err);
        toast.error({
          title: "Couldn't open camera/gallery",
          message: 'Please try again.',
        });
      }
      return [];
    }
    if (images.length === 0) return [];

    // Client-side pre-check only (fail fast, no wasted upload for e.g.
    // iPhone HEIC gallery photos or GIFs) — NOT the security boundary, the
    // server re-validates actual file bytes regardless (see
    // shared/src/storage/uploadMiddleware.ts on the backend).
    const allowedImages = images.filter(img =>
      ALLOWED_IMAGE_TYPES.has(img.type),
    );
    const errors: string[] = new Array(
      images.length - allowedImages.length,
    ).fill(UNSUPPORTED_FORMAT_MESSAGE);

    // Uploaded one at a time, not via Promise.all — firing every multipart
    // POST concurrently made them contend for bandwidth against the shared
    // 15s request timeout (baseApi.ts), so a slow one could time out
    // client-side even though the file had already finished writing on the
    // server, silently dropping it from the returned urls below.
    const urls: string[] = [];
    for (const image of allowedImages) {
      const outcome = await uploadOne(image);
      if ('url' in outcome) urls.push(outcome.url);
      else errors.push(outcome.error);
    }

    if (errors.length > 0) {
      // Surface exactly how many were dropped — a single generic toast here
      // previously made a real per-image failure (e.g. one image exceeding a
      // size limit) indistinguishable from "nothing happened", since the
      // photo grid just silently renders one fewer tile than selected.
      // When every failure shares the same reason (e.g. all HEIC), show
      // that specific message instead of the generic fallback.
      const uniqueMessages = new Set(errors);
      toast.error({
        title:
          errors.length === images.length
            ? "Couldn't upload photo"
            : `${errors.length} of ${images.length} photos couldn't upload`,
        message:
          uniqueMessages.size === 1
            ? errors[0]
            : 'Network issue or file too large — please try again.',
      });
    }
    return urls;
  };

  return { pick, isUploading };
}
