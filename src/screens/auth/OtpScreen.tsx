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
  useResendOtpMutation,
  useVerifyOtpMutation,
  useUpdateProfileMutation,
} from '@/api/authApi';
import { secureStorage } from '@/services/secureStorage';
import { setCredentials } from '@/store/authSlice';
import { mapApiError } from '@/utils/errorMapper';
import { formatPhoneWithPrefix } from '@/utils/formatters';
import { env } from '@/config/env';
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
  const { phone, user, fromGoogle, needsLocation } = route.params;
  const toast = useToast();
  const dispatch = useAppDispatch();

  const [otp, setOtp] = useState('');
  const [hasError, setHasError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const { remaining, expired, restart } = useOtpTimer(OTP_TIMER_SECONDS);

  const [resendOtp, { isLoading: resending }] = useResendOtpMutation();
  const [verifyOtp] = useVerifyOtpMutation();
  const [updateProfile] = useUpdateProfileMutation();

  const blocked = attempts >= OTP_MAX_ATTEMPTS;

  // User-driven edits clear the error highlight; a failed-verify reset of
  // `otp` itself must NOT clear it, or the red boxes never stay visible.
  const handleOtpChange = (text: string) => {
    setOtp(text);
    if (hasError) setHasError(false);
  };

  // Auto-submit once all digits are entered
  useEffect(() => {
    if (otp.length === OTP_LENGTH && !isProcessing && !blocked) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, blocked]);

  const handleVerify = async () => {
    if (isProcessing || blocked) return;
    setIsProcessing(true);

    try {
      // 1. Verify OTP — skipped in mock mode (dummy code, real APIs otherwise)
      if (!env.USE_MOCK_OTP) {
        await verifyOtp({ code: otp }).unwrap();
      }

      // 2. Token was already persisted to Keychain right after login/Google
      //    sign-in — read it fresh here rather than threading the raw JWT
      //    through nav params across three screens.
      const token = await secureStorage.getToken();
      if (!user || !token) {
        throw new Error('Missing session — please sign in again');
      }

      // 3. Google new user who also needs location: update phone now so
      //    authenticated APIs work, but defer setCredentials so
      //    RootNavigator stays on auth stack until the location screen
      //    completes onboarding.
      if (fromGoogle && needsLocation) {
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
          user: {
            ...user,
            phone: formatPhoneWithPrefix(phone),
            phoneVerified: true,
          },
        });
        return;
      }

      // 4. Update Redux + MMKV → triggers RootNavigator switch to Home. Verify-otp
      // just succeeded server-side, but `user` here is the stale object carried
      // through nav params from before verification — patch phoneVerified locally
      // so RootNavigator's gate (state.auth.user?.phoneVerified) flips immediately
      // instead of waiting for the next /auth/me refetch.
      dispatch(
        setCredentials({ user: { ...user, phoneVerified: true }, token }),
      );
      // Verification itself is done — don't keep showing "Verifying…" while
      // the best-effort profile update below is still in flight.
      setIsProcessing(false);

      // 5. Save phone via profile update (best-effort, do not block)
      try {
        await updateProfile({ phone: formatPhoneWithPrefix(phone) }).unwrap();
      } catch {
        // Phone update fail isn't fatal — user is logged in
      }

      toast.success({ title: 'Welcome back!' });
      // Navigation auto-switches to MainNavigator via RootNavigator
    } catch (err) {
      // Session genuinely gone (Keychain wiped, force-logout elsewhere) —
      // no amount of retrying the OTP fixes this, so send the user back to
      // sign in instead of leaving them stuck re-entering codes.
      if (err instanceof Error && err.message.startsWith('Missing session')) {
        toast.error({
          title: 'Session expired',
          message: 'Please sign in again.',
        });
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        return;
      }

      const mapped = mapApiError(err as never);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setHasError(true);

      if (mapped.status === 429) {
        toast.error({
          title: 'Too many attempts',
          message: mapped.message,
        });
      } else if (mapped.isNetworkError || mapped.isServerError) {
        toast.error({ title: 'Could not verify', message: mapped.message });
      } else if (mapped.message.toLowerCase().includes('expired')) {
        toast.error({ title: 'Code expired', message: mapped.message });
      } else if (newAttempts >= OTP_MAX_ATTEMPTS) {
        toast.error({
          title: 'Too many attempts',
          message: 'Please request a new OTP.',
        });
      } else {
        toast.error({ title: 'Incorrect code', message: mapped.message });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResend = async () => {
    if (!expired) return;
    try {
      await resendOtp().unwrap();
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
      toast.error({
        title: mapped.status === 429 ? 'Too many requests' : 'Could not resend',
        message: mapped.message,
      });
    }
  };

  return (
    <Screen scrollable>
      <Header title="Verify OTP" onBack={() => navigation.goBack()} />

      <View style={styles.intro}>
        <Text style={styles.title}>Enter verification code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
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
        title={isProcessing ? 'Verifying…' : 'Verify & Sign In'}
        onPress={handleVerify}
        loading={isProcessing}
        disabled={otp.length !== OTP_LENGTH || isProcessing || blocked}
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
