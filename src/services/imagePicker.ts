import { Alert } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

export interface PickedImage {
  uri: string;
  name: string;
  type: string;
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

export async function pickImageFromLibrary(): Promise<PickedImage | null> {
  const result = await launchImageLibrary(PICKER_OPTIONS);
  const asset = result.assets?.[0];
  if (result.didCancel || !asset?.uri) return null;
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    type: asset.type ?? 'image/jpeg',
  };
}

export async function pickImageFromCamera(): Promise<PickedImage | null> {
  const result = await launchCamera(PICKER_OPTIONS);
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
