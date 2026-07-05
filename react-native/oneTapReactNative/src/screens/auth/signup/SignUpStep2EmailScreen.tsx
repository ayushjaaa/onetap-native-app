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
import { emailSchema } from '@/utils/schemas';
import { trimEmail } from '@/utils/formatters';
import { useSignupContext } from './SignupContext';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignUpEmail'>;

const schema = z.object({ email: emailSchema });
type FormData = z.infer<typeof schema>;

export const SignUpStep2EmailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { data, update } = useSignupContext();

  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: data.email },
    mode: 'onTouched',
  });

  const onSubmit = (values: FormData) => {
    update({ email: trimEmail(values.email) });
    navigation.navigate('SignUpPassword');
  };

  return (
    <Screen scrollable>
      <Header title="Sign Up" onBack={() => navigation.goBack()} />
      <StepIndicator current={2} total={4} />

      <View style={styles.intro}>
        <Text style={styles.title}>Your email address?</Text>
        <Text style={styles.subtitle}>We'll send important updates here.</Text>
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
            returnKeyType="next"
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
