import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Header } from '@/components/common/Header';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { phoneFormSchema, type PhoneFormData } from '@/utils/schemas';
import { useSendOtpMutation } from '@/api/authApi';
import { useToast } from '@/hooks/useToast';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { logout } from '@/store/authSlice';
import { secureStorage } from '@/services/secureStorage';
import { mapApiError } from '@/utils/errorMapper';
import { colors, spacing, typography } from '@/theme';
import type {
  AuthStackParamList,
  AuthScreenProps,
} from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Phone'>;
type Route = AuthScreenProps<'Phone'>['route'];

export const PhoneScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  // RootNavigator lands here with no params for a resumed, still-unverified
  // session — fall back to the already-hydrated Redux user in that case.
  const reduxUser = useAppSelector(state => state.auth.user);
  const params = route.params;
  const email = params?.email ?? reduxUser?.email ?? '';
  const password = params?.password;
  const user = params?.user ?? reduxUser ?? undefined;
  const fromGoogle = params?.fromGoogle;
  const needsLocation = params?.needsLocation;
  const toast = useToast();
  const dispatch = useAppDispatch();

  const [sendOtp, { isLoading }] = useSendOtpMutation();

  // A resumed unverified session lands here with no prior screen in this
  // navigator's stack (RootNavigator mounts AuthNavigator with
  // initialRouteName="Phone" directly) — navigation.goBack() has nowhere to
  // go and just logs a "GO_BACK not handled" warning. Treat back-with-nothing
  // -to-go-back-to as abandoning verification: log out and let RootNavigator
  // fall through to the normal Welcome/Login screen.
  const handleBack = async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    await secureStorage.clearToken();
    dispatch(logout());
  };

  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields, isValid },
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneFormSchema),
    // Backend now requires the entered number to match the number already on
    // file, so prefill it when we already know it (resumed session) instead
    // of making the user retype their own number.
    defaultValues: { phone: reduxUser?.phone ?? '' },
    mode: 'onTouched',
  });

  const onSubmit = async (values: PhoneFormData) => {
    try {
      // Bearer token was already persisted to Keychain right after login —
      // send-otp (authMiddleware-protected) picks it up automatically.
      console.log('[sendOtp] payload:', { phone: values.phone });
      const response = await sendOtp({ phone: values.phone }).unwrap();
      console.log('[sendOtp] raw response:', response);
      navigation.navigate('Otp', {
        email,
        password,
        phone: values.phone,
        user,
        fromGoogle,
        needsLocation,
      });
    } catch (err) {
      console.log('[sendOtp] raw error response:', err);
      const mapped = mapApiError(err as never);
      toast.error({ title: 'Could not send OTP', message: mapped.message });
    }
  };

  return (
    <Screen scrollable testID="phone-verification-screen">
      <Header title="Sign Up" onBack={handleBack} />

      <View style={styles.spacer} />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <PhoneInput
            label="Phone no."
            required
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.phone?.message}
            successMessage={
              touchedFields.phone && !errors.phone && value.length === 10
                ? 'Valid number'
                : undefined
            }
          />
        )}
      />

      <Text style={styles.helperText}>
        An OTP will be sent on given phone number for verification. Standard
        message and data rates apply.
      </Text>

      <View style={styles.spacer} />

      <Button
        title="Get OTP"
        onPress={handleSubmit(onSubmit)}
        disabled={!isValid || isLoading}
        loading={isLoading}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  spacer: {
    flex: 1,
    minHeight: spacing['2xl'],
  },
  helperText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 22,
  },
});
