import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Header } from '@/components/common/Header';
import { useLocation } from '@/hooks/useLocation';
import { useToast } from '@/hooks/useToast';
import { useUpdateProfileMutation } from '@/api/authApi';
import { mapApiError } from '@/utils/errorMapper';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setLocation } from '@/store/locationSlice';
import { openAppSettings, openLocationSettings } from '@/utils/permissions';
import { colors, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'UpdateLocation'>;

export const UpdateLocationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const toast = useToast();

  const {
    status,
    location: resolved,
    error: locError,
    fetch: fetchLocation,
  } = useLocation();
  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation();

  // Unlike the signup step this was copied from, location isn't fetched
  // automatically on mount here — this is an opt-in Profile setting, not an
  // onboarding requirement. If the OS permission is already blocked, an
  // auto-fetch would silently redirect the user to Settings the instant
  // they open this screen, with no visible prompt (Android shows no dialog
  // for an already-blocked permission) — it would look like tapping
  // "Location" in Profile itself throws them out of the app. Requiring an
  // explicit tap first means any Settings redirect only ever follows a
  // deliberate user action.
  useEffect(() => {
    if (status !== 'gps_off') return;
    Alert.alert(
      'Turn on Location',
      'Location services are off. Enable them to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async () => {
            await openLocationSettings();
            fetchLocation();
          },
        },
      ],
    );
  }, [status, fetchLocation]);

  const handleSave = async () => {
    if (!resolved) {
      toast.error({
        title: 'Location required',
        message: 'Please allow location access to continue.',
      });
      return;
    }

    try {
      await updateProfile({
        lat: resolved.latitude,
        lng: resolved.longitude,
        location_address: resolved.address,
        location_city: resolved.city,
        location_state: resolved.state,
        location_pincode: resolved.pincode,
      }).unwrap();

      dispatch(
        setLocation({
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          city: resolved.city ?? null,
          state: resolved.state ?? null,
          address: resolved.address ?? null,
          pincode: resolved.pincode ?? null,
        }),
      );

      toast.success({ title: 'Location updated' });
      navigation.goBack();
    } catch (err) {
      const mapped = mapApiError(err as never);
      toast.error({
        title: 'Could not save location',
        message: mapped.message,
      });
    }
  };

  const isIdle = status === 'idle';
  const isFetching = status === 'requesting' || status === 'fetching';
  const isBlocked = status === 'permission_blocked';
  const isDenied = status === 'permission_denied';

  return (
    <Screen scrollable testID="update-location-screen">
      <Header
        title="Update Location"
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.intro}>
        <Text style={styles.title}>Where are you now?</Text>
        <Text style={styles.subtitle}>
          This updates the home address on your profile — used for nearby
          listings and delivery.
        </Text>
      </View>

      <View style={styles.card}>
        {isIdle && (
          <Text style={styles.statusText}>
            Tap below to detect your current location.
          </Text>
        )}

        {isFetching && (
          <View style={styles.row}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.statusText}>
              {status === 'requesting'
                ? 'Requesting permission…'
                : 'Detecting your location…'}
            </Text>
          </View>
        )}

        {status === 'success' && resolved && (
          <>
            <Text style={styles.label}>Detected location</Text>
            <Text style={styles.value}>
              {resolved.city ?? 'Unknown city'}
              {resolved.state ? `, ${resolved.state}` : ''}
            </Text>
            {resolved.address && (
              <Text style={styles.address} numberOfLines={2}>
                {resolved.address}
              </Text>
            )}
          </>
        )}

        {locError && !isFetching && (
          <Text style={styles.errorText}>{locError}</Text>
        )}
      </View>

      <View style={styles.spacer} />

      {isIdle ? (
        <Button
          testID="update-location-detect-button"
          title="Detect My Location"
          onPress={fetchLocation}
        />
      ) : isBlocked ? (
        <>
          <Button title="Open Settings" onPress={openAppSettings} />
          <View style={styles.btnGap} />
          <Button title="Try Again" variant="outline" onPress={fetchLocation} />
        </>
      ) : isDenied ? (
        <Button title="Try Again" onPress={fetchLocation} />
      ) : status === 'success' ? (
        <Button
          testID="update-location-save-button"
          title="Save Location"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
        />
      ) : (
        <Button
          testID="update-location-retry-button"
          title={isFetching ? 'Fetching…' : 'Retry'}
          onPress={fetchLocation}
          disabled={isFetching}
          loading={isFetching}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  intro: {
    marginVertical: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    minHeight: 140,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  address: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  spacer: {
    flex: 1,
    minHeight: spacing['3xl'],
  },
  btnGap: {
    height: spacing.md,
  },
});
