import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Header } from '@/components/common/Header';
import { StepIndicator } from '@/components/common/StepIndicator';
import { useLocation } from '@/hooks/useLocation';
import { useToast } from '@/hooks/useToast';
import {
  useRegisterMutation,
  useUpdateProfileMutation,
} from '@/api/authApi';
import { mapApiError } from '@/utils/errorMapper';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setLocation } from '@/store/locationSlice';
import { setCredentials } from '@/store/authSlice';
import { secureStorage } from '@/services/secureStorage';
import { openAppSettings } from '@/utils/permissions';
import { useSignupContext } from './SignupContext';
import { colors, spacing, typography } from '@/theme';
import type {
  AuthStackParamList,
  AuthScreenProps,
} from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignUpLocation'>;
type Route = AuthScreenProps<'SignUpLocation'>['route'];

export const SignUpStep4LocationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const fromGoogle = route.params?.fromGoogle === true;
  const googleUser = route.params?.user;
  const googleToken = route.params?.token;
  const { data, update, reset } = useSignupContext();
  const dispatch = useAppDispatch();
  const toast = useToast();

  const {
    status,
    location: resolved,
    error: locError,
    fetch: fetchLocation,
  } = useLocation();
  const [register, { isLoading: registering }] = useRegisterMutation();
  const [updateProfile, { isLoading: updatingProfile }] =
    useUpdateProfileMutation();

  // Auto-trigger location fetch on screen mount
  useEffect(() => {
    fetchLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync resolved location into context + redux
  useEffect(() => {
    if (resolved) {
      update({
        lat: resolved.latitude,
        lng: resolved.longitude,
        city: resolved.city,
        state: resolved.state,
        address: resolved.address,
        pincode: resolved.pincode,
      });
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  const handleCreateAccount = async () => {
    if (!resolved) {
      toast.error({
        title: 'Location required',
        message: 'Please allow location access to continue.',
      });
      return;
    }

    // Google flow: user already exists & token is in route params.
    // Skip register, just attach location via updateProfile, then dispatch.
    if (fromGoogle && googleUser && googleToken) {
      try {
        await updateProfile({
          lat: resolved.latitude,
          lng: resolved.longitude,
          location_address: resolved.address,
          location_city: resolved.city,
          location_state: resolved.state,
          location_pincode: resolved.pincode,
        }).unwrap();

        // Token already saved to Keychain in OtpScreen (or skipped phone path)
        await secureStorage.saveToken(googleToken);
        dispatch(setCredentials({ user: googleUser, token: googleToken }));

        toast.success({
          title: 'Welcome!',
          message: 'Setup complete.',
        });
        // RootNavigator switches to Main automatically
      } catch (err) {
        const mapped = mapApiError(err as never);
        toast.error({ title: 'Could not save location', message: mapped.message });
      }
      return;
    }

    // Manual signup flow (existing)
    const payload = {
      name: data.name,
      email: data.email,
      password: data.password,
      lat: resolved.latitude,
      lng: resolved.longitude,
      city: resolved.city,
      state: resolved.state,
      address: resolved.address,
      pincode: resolved.pincode,
    };
    console.log(
      '[REGISTER] request payload:',
      JSON.stringify(payload, null, 2),
    );

    try {
      const res = await register(payload).unwrap();
      console.log('[REGISTER] success response:', JSON.stringify(res, null, 2));

      toast.success({
        title: 'Account created',
        message: 'Please log in to continue.',
      });
      reset();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err) {
      console.log('[REGISTER] error response:', JSON.stringify(err, null, 2));
      const mapped = mapApiError(err as never);
      console.log('[REGISTER] mapped error:', JSON.stringify(mapped, null, 2));
      toast.error({ title: 'Signup failed', message: mapped.message });
    }
  };

  const isFetching = status === 'requesting' || status === 'fetching';
  const isBlocked =
    status === 'permission_blocked' || status === 'permission_denied';

  return (
    <Screen scrollable>
      <Header
        title={fromGoogle ? 'Almost done' : 'Sign Up'}
        onBack={fromGoogle ? undefined : () => navigation.goBack()}
      />
      {!fromGoogle && <StepIndicator current={4} total={4} />}

      <View style={styles.intro}>
        <Text style={styles.title}>Where are you located?</Text>
        <Text style={styles.subtitle}>
          We use your location to show nearby services and products.
          {'\n'}This is required.
        </Text>
      </View>

      <View style={styles.card}>
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

      {isBlocked ? (
        <>
          <Button title="Open Settings" onPress={openAppSettings} />
          <View style={styles.btnGap} />
          <Button title="Try Again" variant="outline" onPress={fetchLocation} />
        </>
      ) : status === 'success' ? (
        <Button
          title={fromGoogle ? 'Continue' : 'Create Account'}
          onPress={handleCreateAccount}
          loading={registering || updatingProfile}
          disabled={registering || updatingProfile}
        />
      ) : (
        <Button
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
