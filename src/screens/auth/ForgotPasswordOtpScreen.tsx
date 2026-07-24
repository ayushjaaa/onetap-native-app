import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Header } from '@/components/common/Header';
import { OtpInput } from '@/components/auth/OtpInput';
import { useToast } from '@/hooks/useToast';
import { useOtpTimer, formatTimer } from '@/hooks/useOtpTimer';
import {
  useForgotPasswordSendOtpMutation,
  useForgotPasswordVerifyOtpMutation,
} from '@/api/authApi';
import { mapApiError } from '@/utils/errorMapper';
import {
  OTP_LENGTH,
  OTP_TIMER_SECONDS,
  OTP_MAX_ATTEMPTS,
} from '@/config/constants';
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
  const { phone } = route.params;
  const toast = useToast();

  const [otp, setOtp] = useState('');
  const [hasError, setHasError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  const { remaining, expired, restart } = useOtpTimer(OTP_TIMER_SECONDS);

  const [sendOtp, { isLoading: resending }] =
    useForgotPasswordSendOtpMutation();
  const [verifyOtp] = useForgotPasswordVerifyOtpMutation();

  const blocked = attempts >= OTP_MAX_ATTEMPTS;

  const handleOtpChange = (text: string) => {
    setOtp(text);
    if (hasError) setHasError(false);
  };

  const handleVerify = async () => {
    if (isVerifying || blocked || otp.length !== OTP_LENGTH) return;
    setIsVerifying(true);

    try {
      const response = await verifyOtp({ phone, code: otp }).unwrap();
      navigation.navigate('ForgotPasswordReset', {
        token: response.data.resetToken,
      });
    } catch (err) {
      const mapped = mapApiError(err as never);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setHasError(true);

      if (mapped.status === 429) {
        toast.error({ title: 'Too many attempts', message: mapped.message });
      } else if (newAttempts >= OTP_MAX_ATTEMPTS) {
        toast.error({
          title: 'Too many attempts',
          message: 'Please request a new OTP.',
        });
      } else {
        toast.error({ title: 'Incorrect code', message: mapped.message });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!expired) return;
    try {
      await sendOtp({ phone }).unwrap();
      restart();
      setAttempts(0);
      setHasError(false);
      setOtp('');
      toast.success({
        title: 'OTP sent',
        message: `New OTP sent to +91${phone}`,
      });
    } catch (err) {
      const mapped = mapApiError(err as never);
      toast.error({ title: 'Could not resend', message: mapped.message });
    }
  };

  return (
    <Screen scrollable>
      <Header title="Verify OTP" onBack={() => navigation.goBack()} />

      <View style={styles.intro}>
        <Text style={styles.title}>Enter verification code</Text>
        <Text style={styles.subtitle}>
          We sent a {OTP_LENGTH}-digit code to{'\n'}
          <Text style={styles.phoneText}>+91 {phone}</Text>
        </Text>
      </View>

      <View style={styles.otpWrap}>
        <OtpInput
          value={otp}
          onChangeText={handleOtpChange}
          hasError={hasError}
          disabled={blocked}
        />
      </View>

      {blocked && (
        <Text style={styles.blockedText}>
          Maximum attempts reached. Tap "Resend" once timer expires.
        </Text>
      )}

      <View style={styles.timerRow}>
        {expired ? (
          <Pressable
            onPress={handleResend}
            disabled={resending}
            hitSlop={8}
            style={({ pressed }) => [
              styles.resendBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.resendText}>
              {resending ? 'Sending…' : 'Resend OTP'}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.timerText}>
            Resend in {formatTimer(remaining)}
          </Text>
        )}
      </View>

      <View style={styles.spacer} />

      <Button
        title={isVerifying ? 'Verifying…' : 'Verify'}
        onPress={handleVerify}
        loading={isVerifying}
        disabled={otp.length !== OTP_LENGTH || isVerifying || blocked}
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
  phoneText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  otpWrap: {
    marginVertical: spacing.xl,
  },
  blockedText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  timerRow: {
    alignItems: 'center',
    marginTop: spacing.base,
  },
  timerText: {
    ...typography.body,
    color: colors.textSecondary,
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
});
