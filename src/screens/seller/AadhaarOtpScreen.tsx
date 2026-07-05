import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { ChevronLeft, Clock, ShieldAlert } from 'lucide-react-native';
import { OtpDigitField } from '@/components/common/OtpDigitField';
import { useToast } from '@/hooks/useToast';
import { formatTimer, useOtpTimer } from '@/hooks/useOtpTimer';
import {
  colors,
  fontSize,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'AadhaarOtp'>;
type Props = NativeStackScreenProps<MainStackParamList, 'AadhaarOtp'>;

const AADHAAR_OTP_LENGTH = 6;
const WINDOW_SECONDS = 120;
const MAX_ATTEMPTS = 3;
// Dev-only magic OTP until KYC vendor is wired.
const MOCK_OTP = '123456';

export const AadhaarOtpScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const { aadhaarLast4 } = route.params;

  const [otp, setOtp] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [hasError, setHasError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const { remaining, expired, restart } = useOtpTimer(WINDOW_SECONDS);
  const outOfAttempts = attemptsLeft <= 0;
  const lockedThisWindow = outOfAttempts && !expired;

  const verify = useCallback(async () => {
    if (isVerifying || lockedThisWindow) return;
    setIsVerifying(true);

    try {
      // TODO: replace with real KYC vendor verify call.
      await new Promise<void>(resolve => setTimeout(() => resolve(), 700));

      if (otp !== MOCK_OTP) {
        const next = attemptsLeft - 1;
        setAttemptsLeft(next);
        setHasError(true);
        setOtp('');
        return;
      }

      toast.success({
        title: 'Aadhaar verified',
        message: 'You can now choose your seller type.',
      });

      // `replace` so the user can't back-button into the OTP screen after
      // verification (the OTP is single-use; landing back here would be a
      // dead end requiring a Resend).
      navigation.replace('SellerType');
    } catch {
      toast.error({
        title: "Couldn't verify",
        message: 'Network issue — please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  }, [
    isVerifying,
    lockedThisWindow,
    otp,
    attemptsLeft,
    toast,
    navigation,
  ]);

  // Clear inline error as soon as the user starts re-typing.
  useEffect(() => {
    if (hasError && otp.length < AADHAAR_OTP_LENGTH) {
      setHasError(false);
    }
  }, [otp, hasError]);

  // Auto-submit at full length.
  useEffect(() => {
    if (otp.length === AADHAAR_OTP_LENGTH && !isVerifying && !lockedThisWindow) {
      verify();
    }
  }, [otp, isVerifying, lockedThisWindow, verify]);

  const handleResend = async () => {
    if (!expired || isResending) return;
    setIsResending(true);
    try {
      // TODO: real KYC vendor resend call.
      await new Promise<void>(resolve => setTimeout(() => resolve(), 600));
      setAttemptsLeft(MAX_ATTEMPTS);
      setHasError(false);
      setOtp('');
      restart();
      toast.success({ title: 'New OTP sent' });
    } catch {
      toast.error({ title: 'Resend failed', message: 'Try again in a moment.' });
    } finally {
      setIsResending(false);
    }
  };

  const helperLine = (() => {
    if (lockedThisWindow) {
      return 'Wait for the timer to resend.';
    }
    if (hasError) {
      return `Wrong OTP. ${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`;
    }
    return "Didn't get the OTP? Make sure your Aadhaar-linked number is active.";
  })();

  const helperTone = hasError || lockedThisWindow ? 'error' : 'muted';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={navigation.goBack}
          hitSlop={spacing.md}
          style={styles.backBtn}
        >
          <ChevronLeft size={layout.iconSize.lg} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Verify Aadhaar</Text>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>Step 2/3</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>Enter OTP</Text>
        <Text style={styles.subhead}>
          Sent to Aadhaar-linked mobile (••••{aadhaarLast4})
        </Text>

        <View style={styles.otpWrap}>
          <OtpDigitField
            value={otp}
            onChangeText={setOtp}
            length={AADHAAR_OTP_LENGTH}
            hasError={hasError}
            disabled={isVerifying || lockedThisWindow}
          />
        </View>

        <View style={styles.timerRow}>
          {expired ? (
            <Pressable
              onPress={handleResend}
              disabled={isResending}
              hitSlop={spacing.sm}
              style={styles.resendBtn}
            >
              {isResending ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={styles.resendText}>Resend OTP</Text>
              )}
            </Pressable>
          ) : (
            <>
              <Clock size={layout.iconSize.sm} color={colors.textMuted} />
              <Text style={styles.timerText}>
                Resend in {formatTimer(remaining)}
              </Text>
            </>
          )}
        </View>

        <View
          style={[
            styles.helperRow,
            helperTone === 'error' && styles.helperRowError,
          ]}
        >
          {helperTone === 'error' ? (
            <ShieldAlert size={layout.iconSize.sm} color={colors.error} />
          ) : null}
          <Text
            style={[
              styles.helperText,
              helperTone === 'error' && styles.helperTextError,
            ]}
          >
            {helperLine}
          </Text>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={verify}
          disabled={
            otp.length !== AADHAAR_OTP_LENGTH || isVerifying || lockedThisWindow
          }
          style={({ pressed }) => [
            styles.primaryBtn,
            (otp.length !== AADHAAR_OTP_LENGTH || lockedThisWindow) &&
              styles.primaryBtnDisabled,
            pressed && styles.primaryBtnPressed,
          ]}
        >
          {isVerifying ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Verify</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    flex: 1,
  },
  stepPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryAlpha15,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
  },
  stepPillText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  heading: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  subhead: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  otpWrap: {
    marginTop: spacing['2xl'],
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    minHeight: layout.iconSize.lg,
  },
  timerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  resendBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  resendText: {
    ...typography.label,
    color: colors.primary,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  helperRowError: {
    // no extra style; the icon + colour change carries the meaning
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    flexShrink: 1,
  },
  helperTextError: {
    color: colors.error,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  primaryBtn: {
    height: layout.buttonHeight,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: colors.primaryAlpha30,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    ...typography.button,
    color: colors.white,
  },
});
