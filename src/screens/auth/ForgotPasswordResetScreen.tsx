import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CommonActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Header } from '@/components/common/Header';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar';
import { useToast } from '@/hooks/useToast';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useResetPasswordMutation } from '@/api/authApi';
import { mapApiError } from '@/utils/errorMapper';
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from '@/utils/schemas';
import { colors, spacing, typography } from '@/theme';
import type {
  AuthStackParamList,
  AuthScreenProps,
} from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPasswordReset'>;
type Route = AuthScreenProps<'ForgotPasswordReset'>['route'];

export const ForgotPasswordResetScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { token } = route.params;
  const toast = useToast();
  const isLoggedIn = useAppSelector(state => state.auth.isLoggedIn);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, touchedFields, isValid },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const password = watch('password');

  const onSubmit = async (values: ResetPasswordFormData) => {
    try {
      await resetPassword({ token, newPassword: values.password }).unwrap();

      if (isLoggedIn) {
        // Logged-in user (came from Profile) → return to Tabs
        toast.success({
          title: 'Password reset',
          message: 'Your password has been updated.',
        });
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Tabs' }],
          }),
        );
      } else {
        // Logged-out user (came from Login) → send to Login
        toast.success({
          title: 'Password reset',
          message: 'Your password has been updated. Please sign in.',
        });
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [{ name: 'Welcome' }, { name: 'Login' }],
          }),
        );
      }
    } catch (err) {
      const mapped = mapApiError(err as never);
      toast.error({ title: 'Reset failed', message: mapped.message });
    }
  };

  return (
    <Screen scrollable>
      <Header title="Reset Password" onBack={() => navigation.goBack()} />

      <View style={styles.intro}>
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>
          Choose a strong password you haven't used before.
        </Text>
      </View>

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <PasswordInput
              label="New password"
              required
              placeholder="Enter new password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
            <PasswordStrengthBar password={value} />
            <PasswordRequirements password={value} />
          </>
        )}
      />

      <View style={styles.gap} />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <PasswordInput
            label="Confirm password"
            required
            placeholder="Re-enter new password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.confirmPassword?.message}
            successMessage={
              touchedFields.confirmPassword &&
              !errors.confirmPassword &&
              value.length > 0 &&
              value === password
                ? 'Passwords match'
                : undefined
            }
          />
        )}
      />

      <View style={styles.spacer} />

      <Button
        title="Reset Password"
        onPress={handleSubmit(onSubmit)}
        loading={isLoading}
        disabled={!isValid || isLoading}
      />
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
    lineHeight: 22,
  },
  gap: {
    height: spacing.lg,
  },
  spacer: {
    flex: 1,
    minHeight: spacing['3xl'],
  },
});
