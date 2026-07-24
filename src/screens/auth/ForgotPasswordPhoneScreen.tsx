import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Header } from '@/components/common/Header';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { useToast } from '@/hooks/useToast';
import { useForgotPasswordSendOtpMutation } from '@/api/authApi';
import { mapApiError } from '@/utils/errorMapper';
import { phoneFormSchema, type PhoneFormData } from '@/utils/schemas';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPasswordPhone'>;

export const ForgotPasswordPhoneScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const [sendOtp, { isLoading }] = useForgotPasswordSendOtpMutation();

  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields, isValid },
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: '' },
    mode: 'onTouched',
  });

  const onSubmit = async (values: PhoneFormData) => {
    console.log('[forgotPasswordSendOtp] request body:', {
      phone: values.phone,
    });
    try {
      const response = await sendOtp({ phone: values.phone }).unwrap();
      console.log(
        '[forgotPasswordSendOtp] raw response:',
        JSON.stringify(response, null, 2),
      );
      navigation.navigate('ForgotPasswordOtp', { phone: values.phone });
    } catch (err) {
      console.log(
        '[forgotPasswordSendOtp] raw error response:',
        JSON.stringify(err, null, 2),
      );
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
          Enter your registered phone number. If it's registered, we'll send you
          an OTP to reset your password.
        </Text>
      </View>

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

      <View style={styles.spacer} />

      <Button
        title="Send OTP"
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
