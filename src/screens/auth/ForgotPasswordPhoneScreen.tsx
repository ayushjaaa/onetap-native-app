import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { trimEmail } from '@/utils/formatters';
import {
  forgotPasswordEmailSchema,
  type ForgotPasswordEmailFormData,
} from '@/utils/schemas';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPasswordPhone'>;

export const ForgotPasswordPhoneScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields, isValid },
  } = useForm<ForgotPasswordEmailFormData>({
    resolver: zodResolver(forgotPasswordEmailSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const onSubmit = async (values: ForgotPasswordEmailFormData) => {
    const email = trimEmail(values.email);
    try {
      await forgotPassword({ email }).unwrap();
      navigation.navigate('ForgotPasswordOtp', { email });
    } catch (err) {
      const mapped = mapApiError(err as never);
      toast.error({ title: 'Request failed', message: mapped.message });
    }
  };

  return (
    <Screen scrollable>
      <Header title="Forgot Password" onBack={() => navigation.goBack()} />

      <View style={styles.intro}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Enter your registered email address. If it's registered, we'll send
          you a password reset link.
        </Text>
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email"
            required
            placeholder="you@example.com"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="done"
            error={errors.email?.message}
            successMessage={
              touchedFields.email && !errors.email && value.length > 0
                ? 'Valid email'
                : undefined
            }
          />
        )}
      />

      <View style={styles.spacer} />

      <Button
        title="Send reset link"
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
  spacer: {
    flex: 1,
    minHeight: spacing['3xl'],
  },
});
