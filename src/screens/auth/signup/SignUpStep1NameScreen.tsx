import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Header } from '@/components/common/Header';
import { StepIndicator } from '@/components/common/StepIndicator';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { nameSchema, phoneSchema } from '@/utils/schemas';
import { capitalizeName } from '@/utils/formatters';
import { useSignupContext } from './SignupContext';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignUpName'>;

const schema = z.object({ name: nameSchema, phone: phoneSchema });
type FormData = z.infer<typeof schema>;

export const SignUpStep1NameScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { data, update } = useSignupContext();

  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: data.name, phone: data.phone },
    mode: 'onTouched',
  });

  const onSubmit = (values: FormData) => {
    update({ name: capitalizeName(values.name), phone: values.phone });
    navigation.navigate('SignUpEmail');
  };

  return (
    <Screen scrollable testID="signup-step1-screen">
      <Header title="Sign Up" onBack={() => navigation.goBack()} />
      <StepIndicator current={1} total={4} />

      <View style={styles.intro}>
        <Text style={styles.title}>What's your name?</Text>
        <Text style={styles.subtitle}>
          We'll use this to personalize your experience, and your phone number
          to keep your account secure.
        </Text>
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            testID="signup-name-input"
            label="Name"
            required
            placeholder="Enter your full name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            error={errors.name?.message}
            successMessage={
              touchedFields.name && !errors.name && value.length >= 2
                ? 'Looks good'
                : undefined
            }
          />
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <PhoneInput
            testID="signup-phone-input"
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
        testID="signup-step1-next-button"
        title="Next"
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
  },
  spacer: {
    flex: 1,
    minHeight: spacing['4xl'],
  },
});
