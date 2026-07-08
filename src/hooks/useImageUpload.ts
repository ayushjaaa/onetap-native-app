import {
  pickImageFromCamera,
  pickImageFromLibrary,
  promptImageSource,
} from '@/services/imagePicker';
import {
  useUploadAvatarImageMutation,
  useUploadListingImageMutation,
} from '@/api/uploadApi';
import { useToast } from '@/hooks/useToast';

export type UploadTarget = 'avatar' | 'listing';

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

  const pick = async (): Promise<string | null> => {
    const source = await promptImageSource();
    if (!source) return null;

    const image =
      source === 'camera'
        ? await pickImageFromCamera()
        : await pickImageFromLibrary();
    if (!image) return null;

    try {
      if (target === 'avatar') {
        const result = await uploadAvatar(image).unwrap();
        return result.avatarUrl;
      }
      const result = await uploadListing(image).unwrap();
      return result.url;
    } catch {
      toast.error({
        title: "Couldn't upload photo",
        message: 'Network issue — phir try karein.',
      });
      return null;
    }
  };

  return { pick, isUploading };
}
