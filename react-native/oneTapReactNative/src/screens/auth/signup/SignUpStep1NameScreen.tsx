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
import { nameSchema } from '@/utils/schemas';
import { capitalizeName } from '@/utils/formatters';
import { useSignupContext } from './SignupContext';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignUpName'>;

const schema = z.object({ name: nameSchema });
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
    defaultValues: { name: data.name },
    mode: 'onTouched',
  });

  const onSubmit = (values: FormData) => {
    update({ name: capitalizeName(values.name) });
    navigation.navigate('SignUpEmail');
  };

  return (
    <Screen scrollable>
      <Header title="Sign Up" onBack={() => navigation.goBack()} />
      <StepIndicator current={1} total={4} />

      <View style={styles.intro}>
        <Text style={styles.title}>What's your name?</Text>
        <Text style={styles.subtitle}>
          We'll use this to personalize your experience.
        </Text>
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
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
