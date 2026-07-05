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
import { phoneFormSchema, type PhoneFormData } from '@/utils/schemas';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<
  AuthStackParamList,
  'ForgotPasswordPhone'
>;

export const ForgotPasswordPhoneScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields, isValid },
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: '' },
    mode: 'onTouched',
  });

  const onSubmit = (values: PhoneFormData) => {
    navigation.navigate('ForgotPasswordOtp', { phone: values.phone });
  };

  return (
    <Screen scrollable>
      <Header title="Forgot Password" onBack={() => navigation.goBack()} />

      <View style={styles.intro}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Enter your registered mobile number. We'll send you a 4-digit OTP to
          verify your identity.
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
        disabled={!isValid}
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
