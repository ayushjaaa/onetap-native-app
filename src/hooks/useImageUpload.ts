import {
  pickImageFromCamera,
  pickImagesFromLibrary,
  promptImageSource,
  type PickedImage,
} from '@/services/imagePicker';
import {
  useUploadAvatarImageMutation,
  useUploadListingImageMutation,
} from '@/api/uploadApi';
import { useToast } from '@/hooks/useToast';
import { env } from '@/config/env';

export type UploadTarget = 'avatar' | 'listing';

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

  const uploadOne = async (image: PickedImage): Promise<string | null> => {
    try {
      if (target === 'avatar') {
        const result = await uploadAvatar(image).unwrap();
        return result.avatarUrl;
      }
      const result = await uploadListing(image).unwrap();
      return result.url;
    } catch (err) {
      console.warn(`[useImageUpload] upload failed for ${image.name}:`, err);
      return null;
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

    const source = await promptImageSource();
    if (!source) return [];

    const images =
      source === 'camera'
        ? await pickImageFromCamera().then(img => (img ? [img] : []))
        : await pickImagesFromLibrary(maxCount);
    if (images.length === 0) return [];

    // Uploaded one at a time, not via Promise.all — firing every multipart
    // POST concurrently made them contend for bandwidth against the shared
    // 15s request timeout (baseApi.ts), so a slow one could time out
    // client-side even though the file had already finished writing on the
    // server, silently dropping it from the returned urls below.
    const uploaded: (string | null)[] = [];
    for (const image of images) {
      uploaded.push(await uploadOne(image));
    }
    const urls = uploaded.filter((url): url is string => url != null);
    const failedCount = images.length - urls.length;
    if (failedCount > 0) {
      // Surface exactly how many were dropped — a single generic toast here
      // previously made a real per-image failure (e.g. one image exceeding a
      // size limit) indistinguishable from "nothing happened", since the
      // photo grid just silently renders one fewer tile than selected.
      toast.error({
        title:
          failedCount === images.length
            ? "Couldn't upload photo"
            : `${failedCount} of ${images.length} photos couldn't upload`,
        message: 'Network issue or file too large — please try again.',
      });
    }
    return urls;
  };

  return { pick, isUploading };
}
