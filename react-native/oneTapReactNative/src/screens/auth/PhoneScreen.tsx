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
  const { email, password, user, token, fromGoogle, needsLocation } =
    route.params;
  const toast = useToast();

  const [sendOtp, { isLoading }] = useSendOtpMutation();

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
    try {
      await sendOtp({ phone: values.phone }).unwrap();
      navigation.navigate('Otp', {
        email,
        password,
        phone: values.phone,
        user,
        token,
        fromGoogle,
        needsLocation,
      });
    } catch (err) {
      const mapped = mapApiError(err as never);
      toast.error({ title: 'Could not send OTP', message: mapped.message });
    }
  };

  return (
    <Screen scrollable>
      <Header title="Sign Up" onBack={() => navigation.goBack()} />

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
