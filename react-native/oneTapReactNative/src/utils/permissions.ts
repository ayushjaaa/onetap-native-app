import { Linking, PermissionsAndroid, Platform } from 'react-native';

export type PermissionResult = 'granted' | 'denied' | 'blocked';

export const requestLocationPermission =
  async (): Promise<PermissionResult> => {
    if (Platform.OS === 'ios') {
      // iOS handled by Geolocation library prompt
      return 'granted';
    }

    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message:
            'OneTap365 needs your location to show services and products near you.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)
        return 'blocked';
      return 'denied';
    } catch {
      return 'denied';
    }
  };

export const openAppSettings = (): Promise<void> => {
  return Linking.openSettings();
};
