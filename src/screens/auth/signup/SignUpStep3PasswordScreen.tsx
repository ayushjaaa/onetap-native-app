import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Header } from '@/components/common/Header';
import { StepIndicator } from '@/components/common/StepIndicator';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthBar } from '@/components/auth/PasswordStrengthBar';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { passwordSchema } from '@/utils/schemas';
import { useSignupContext } from './SignupContext';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignUpPassword'>;

const schema = z.object({ password: passwordSchema });
type FormData = z.infer<typeof schema>;

export const SignUpStep3PasswordScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { data, update } = useSignupContext();

  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: data.password },
    mode: 'onTouched',
  });

  const onSubmit = (values: FormData) => {
    update({ password: values.password });
    navigation.navigate('SignUpLocation');
  };

  return (
    <Screen scrollable>
      <Header title="Sign Up" onBack={() => navigation.goBack()} />
      <StepIndicator current={3} total={4} />

      <View style={styles.intro}>
        <Text style={styles.title}>Create a password</Text>
        <Text style={styles.subtitle}>
          Make it strong — your password protects your account.
        </Text>
      </View>

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <PasswordInput
              label="Password"
              required
              placeholder="Enter your password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              successMessage={
                touchedFields.password && !errors.password && value.length >= 8
                  ? 'Strong password'
                  : undefined
              }
            />
            <PasswordStrengthBar password={value} />
            <PasswordRequirements password={value} />
          </>
        )}
      />

      <View style={styles.spacer} />

      <Button
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
