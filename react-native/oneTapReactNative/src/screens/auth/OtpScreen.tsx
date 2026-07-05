import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Header } from '@/components/common/Header';
import { OtpInput } from '@/components/auth/OtpInput';
import { useToast } from '@/hooks/useToast';
import { useOtpTimer, formatTimer } from '@/hooks/useOtpTimer';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import {
  useSendOtpMutation,
  useVerifyOtpMutation,
  useUpdateProfileMutation,
} from '@/api/authApi';
import { secureStorage } from '@/services/secureStorage';
import { setCredentials } from '@/store/authSlice';
import { mapApiError } from '@/utils/errorMapper';
import { formatPhoneWithPrefix } from '@/utils/formatters';
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

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Otp'>;
type Route = AuthScreenProps<'Otp'>['route'];

export const OtpScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { phone, user, token, fromGoogle, needsLocation } = route.params;
  const toast = useToast();
  const dispatch = useAppDispatch();

  const [otp, setOtp] = useState('');
  const [hasError, setHasError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const { remaining, expired, restart } = useOtpTimer(OTP_TIMER_SECONDS);

  const [sendOtp, { isLoading: resending }] = useSendOtpMutation();
  const [verifyOtp] = useVerifyOtpMutation();
  const [updateProfile] = useUpdateProfileMutation();

  // Clear error as user retypes
  useEffect(() => {
    if (hasError && otp.length < OTP_LENGTH) {
      setHasError(false);
    }
  }, [otp, hasError]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (otp.length === OTP_LENGTH && !isProcessing) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleVerify = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. Verify OTP (mock — checks against 1234)
      await verifyOtp({ phone, otp }).unwrap();

      // 2. Use user + token already received from previous step
      //    (login API for manual flow, /auth/google for Google flow)
      if (!user || !token) {
        throw new Error('Missing session — please sign in again');
      }

      // 3. Google new user who also needs location:
      //    Save token + phone now so authenticated APIs work, but defer
      //    setCredentials so RootNavigator stays on auth stack until the
      //    location screen completes onboarding.
      if (fromGoogle && needsLocation) {
        await secureStorage.saveToken(token);
        try {
          await updateProfile({
            phone: formatPhoneWithPrefix(phone),
          }).unwrap();
        } catch {
          // Phone update fail isn't fatal — token is saved, location screen
          // will dispatch setCredentials after location is set
        }
        navigation.navigate('SignUpLocation', {
          fromGoogle: true,
          user: { ...user, phone: formatPhoneWithPrefix(phone) },
          token,
        });
        return;
      }

      // 4. Persist token to Keychain
      await secureStorage.saveToken(token);

      // 5. Update Redux + MMKV → triggers RootNavigator switch to Home
      dispatch(setCredentials({ user, token }));

      // 6. Save phone via profile update (best-effort, do not block)
      try {
        await updateProfile({ phone: formatPhoneWithPrefix(phone) }).unwrap();
      } catch {
        // Phone update fail isn't fatal — user is logged in
      }

      toast.success({ title: 'Welcome back!' });
      // Navigation auto-switches to MainNavigator via RootNavigator
    } catch (err) {
      const mapped = mapApiError(err as never);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setHasError(true);
      setOtp('');

      if (newAttempts >= OTP_MAX_ATTEMPTS) {
        toast.error({
          title: 'Too many attempts',
          message: 'Please request a new OTP.',
        });
      } else {
        toast.error({
          title: 'Verification failed',
          message: mapped.message,
        });
      }
    } finally {
      setIsProcessing(false);
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

  const blocked = attempts >= OTP_MAX_ATTEMPTS;

  return (
    <Screen scrollable>
      <Header title="Verify OTP" onBack={() => navigation.goBack()} />

      <View style={styles.intro}>
        <Text style={styles.title}>Enter verification code</Text>
        <Text style={styles.subtitle}>
          We sent a 4-digit code to{'\n'}
          <Text style={styles.phoneText}>+91 {phone}</Text>
        </Text>
      </View>

      <View style={styles.otpWrap}>
        <OtpInput value={otp} onChangeText={setOtp} hasError={hasError} />
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
        title={isProcessing ? 'Verifying…' : 'Verify & Sign In'}
        onPress={handleVerify}
        loading={isProcessing}
        disabled={otp.length !== OTP_LENGTH || isProcessing || blocked}
      />

      <Text style={styles.mockHint}>
        Demo mode: use OTP <Text style={styles.mockOtp}>1234</Text>
      </Text>
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
  mockHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.base,
  },
  mockOtp: {
    color: colors.primary,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
