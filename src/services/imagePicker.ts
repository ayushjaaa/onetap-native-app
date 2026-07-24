import { Alert } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

// react-native-image-picker reports a permanently-denied permission as
// errorCode: 'permission', distinct from didCancel (user tapped Cancel).
// Thrown so callers can tell "denied — show a settings prompt" apart from
// "cancelled — do nothing", instead of both collapsing to an empty result.
export class ImagePickerPermissionError extends Error {
  constructor() {
    super('Camera/gallery permission denied');
    this.name = 'ImagePickerPermissionError';
  }
}

const PICKER_OPTIONS = {
  mediaType: 'photo' as const,
  quality: 0.8 as const,
  maxWidth: 1600,
  maxHeight: 1600,
};

// react-native-image-picker prompts the native camera/gallery permission dialogs
// itself when launchCamera/launchImageLibrary is called — no separate
// PermissionsAndroid step needed here (unlike requestLocationPermission in
// utils/permissions.ts, which gates a non-picker native module).

/**
 * `selectionLimit` caps how many photos the native picker lets the user tap
 * at once — pass the number of remaining slots so a listing near its max
 * can't multi-select past it. `1` (the default) keeps single-select for
 * callers like avatar upload, where more than one result would be silently
 * wrong. `0` means "no limit" per react-native-image-picker's own API.
 */
export async function pickImagesFromLibrary(
  selectionLimit = 1,
): Promise<PickedImage[]> {
  const result = await launchImageLibrary({
    ...PICKER_OPTIONS,
    selectionLimit,
  });
  if (result.errorCode === 'permission') throw new ImagePickerPermissionError();
  if (result.didCancel || !result.assets?.length) return [];
  return result.assets
    .filter((asset): asset is typeof asset & { uri: string } => !!asset.uri)
    .map(asset => ({
      uri: asset.uri,
      name: asset.fileName ?? `photo-${Date.now()}.jpg`,
      type: asset.type ?? 'image/jpeg',
    }));
}

export async function pickImageFromCamera(): Promise<PickedImage | null> {
  const result = await launchCamera(PICKER_OPTIONS);
  if (result.errorCode === 'permission') throw new ImagePickerPermissionError();
  const asset = result.assets?.[0];
  if (result.didCancel || !asset?.uri) return null;
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    type: asset.type ?? 'image/jpeg',
  };
}

/** Resolves to null if the user dismisses without choosing a source. */
export function promptImageSource(): Promise<'camera' | 'library' | null> {
  return new Promise(resolve => {
    Alert.alert('Add photo', 'Choose a source', [
      { text: 'Camera', onPress: () => resolve('camera') },
      { text: 'Gallery', onPress: () => resolve('library') },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
