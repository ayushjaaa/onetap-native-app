import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useToast } from '@/hooks/useToast';
import {
  type AadhaarValidationError,
  formatAadhaarDisplay,
  stripAadhaar,
  validateAadhaar,
} from '@/utils/aadhaar';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'AadhaarNumber'>;

const ERROR_COPY: Record<AadhaarValidationError, string> = {
  incomplete: 'Enter all 12 digits',
  invalid_first_digit: "Aadhaar can't start with 0 or 1",
  invalid_checksum: "This doesn't look like a valid Aadhaar number",
};

export const AadhaarNumberScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const user = useAppSelector(state => state.auth.user);

  const [display, setDisplay] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [touched, setTouched] = useState(false);

  const digits = stripAadhaar(display);
  const validation = useMemo(() => validateAadhaar(digits), [digits]);
  const canSubmit = validation.ok && !isSending;

  // Defensive: if user is already Aadhaar-verified, don't make them re-enter.
  // TODO: when S4 (Seller Type) ships, replace this with navigate('SellerType').
  useEffect(() => {
    if (user?.aadhaarVerified) {
      navigation.goBack();
    }
  }, [user?.aadhaarVerified, navigation]);

  const handleChange = (next: string) => {
    setDisplay(formatAadhaarDisplay(next));
    if (!touched) setTouched(true);
  };

  const handleSend = async () => {
    if (!canSubmit) return;
    setIsSending(true);
    try {
      // TODO: replace mock with real KYC vendor call once Setu / Karza is picked.
      // Aadhaar number is sent over HTTPS to backend; never persisted client-side.
      await new Promise<void>(resolve => setTimeout(() => resolve(), 800));

      toast.success({
        title: 'OTP sent',
        message: 'Check your Aadhaar-linked mobile number.',
      });

      navigation.navigate('AadhaarOtp', {
        aadhaarLast4: digits.slice(-4),
      });
    } catch {
      toast.error({
        title: 'Verification service down',
        message: 'Try again in a moment.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const showError = touched && !!validation.error && digits.length > 0;
  const helperText = showError
    ? ERROR_COPY[validation.error!]
    : 'Make sure your Aadhaar-linked mobile number is reachable — the OTP will be sent there.';

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
          <Text style={styles.stepPillText}>Step 1/3</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.privacyCard}>
            <ShieldCheck
              size={layout.iconSize.base}
              color={colors.primary}
              style={styles.privacyIcon}
            />
            <Text style={styles.privacyText}>
              Your Aadhaar is shared securely with UIDAI only, via our KYC
              partner. We only store the last 4 digits.
            </Text>
          </View>

          <Text style={styles.inputLabel}>Aadhaar number</Text>
          <TextInput
            value={display}
            onChangeText={handleChange}
            placeholder="XXXX XXXX XXXX"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={14}
            autoFocus
            style={[styles.input, showError && styles.inputError]}
            accessibilityLabel="Aadhaar number"
            editable={!isSending}
          />
          <Text style={[styles.helper, showError && styles.helperError]}>
            {showError ? '⚠ ' : 'ℹ '}
            {helperText}
          </Text>
        </View>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleSend}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.primaryBtn,
            !canSubmit && styles.primaryBtnDisabled,
            pressed && canSubmit && styles.primaryBtnPressed,
          ]}
        >
          {isSending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Send OTP</Text>
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
  flex: {
    flex: 1,
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
    paddingTop: spacing.base,
  },
  privacyCard: {
    flexDirection: 'row',
    backgroundColor: colors.primaryAlpha10,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  privacyIcon: {
    marginTop: spacing['2xs'],
  },
  privacyText: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  inputLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  input: {
    height: layout.inputHeight,
    borderRadius: radius.lg,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    letterSpacing: 2,
    fontWeight: '600',
  },
  inputError: {
    borderColor: colors.borderError,
  },
  helper: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: fontSize.sm * 1.5,
  },
  helperError: {
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
