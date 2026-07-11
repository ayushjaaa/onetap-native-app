import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Header } from '@/components/common/Header';
import { useToast } from '@/hooks/useToast';
import { useForgotPasswordMutation } from '@/api/authApi';
import { mapApiError } from '@/utils/errorMapper';
import { resetTokenFormSchema, type ResetTokenFormData } from '@/utils/schemas';
import { env } from '@/config/env';
import { colors, spacing, typography } from '@/theme';
import type {
  AuthStackParamList,
  AuthScreenProps,
} from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPasswordOtp'>;
type Route = AuthScreenProps<'ForgotPasswordOtp'>['route'];

export const ForgotPasswordOtpScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { email } = route.params;
  const toast = useToast();
  const [forgotPassword, { isLoading: resending }] =
    useForgotPasswordMutation();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ResetTokenFormData>({
    resolver: zodResolver(resetTokenFormSchema),
    defaultValues: { token: '' },
    mode: 'onTouched',
  });

  const [resent, setResent] = useState(false);

  const onSubmit = (values: ResetTokenFormData) => {
    navigation.navigate('ForgotPasswordReset', { token: values.token.trim() });
  };

  const handleResend = async () => {
    try {
      await forgotPassword({ email }).unwrap();
      setResent(true);
      toast.success({
        title: 'Email sent',
        message: `A new reset link was sent to ${email}`,
      });
    } catch (err) {
      const mapped = mapApiError(err as never);
      toast.error({ title: 'Resend failed', message: mapped.message });
    }
  };

  return (
    <Screen scrollable>
      <Header title="Check your email" onBack={() => navigation.goBack()} />

      <View style={styles.intro}>
        <Text style={styles.title}>Enter your reset token</Text>
        <Text style={styles.subtitle}>
          If <Text style={styles.emailText}>{email}</Text> is registered, we've
          sent a password reset link there. Paste the token from that email
          below.
        </Text>
      </View>

      <Controller
        control={control}
        name="token"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Reset token"
            required
            placeholder="Paste your reset token"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.token?.message}
          />
        )}
      />

      <View style={styles.resendRow}>
        <Pressable
          onPress={handleResend}
          hitSlop={8}
          disabled={resending}
          style={({ pressed }) => [styles.resendBtn, pressed && styles.pressed]}
        >
          <Text style={styles.resendText}>
            {resending ? 'Sending…' : "Didn't get it? Resend"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.spacer} />

      <Button
        title="Continue"
        onPress={handleSubmit(onSubmit)}
        disabled={!isValid}
      />

      {env.USE_MOCK_OTP && (
        <Text style={styles.mockHint}>
          Dev mode: the reset token is logged server-side (USE_MOCK_OTP=true) —
          check the auth-service logs.
        </Text>
      )}
      {resent && !env.USE_MOCK_OTP && (
        <Text style={styles.mockHint}>New link sent.</Text>
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
    lineHeight: 22,
  },
  emailText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: spacing.base,
  },
  resendBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.6,
  },
  resendText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  spacer: {
    flex: 1,
    minHeight: spacing['3xl'],
  },
  mockHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.base,
  },
});
