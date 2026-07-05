import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  Mail,
  XCircle,
} from 'lucide-react-native';
import { useAppSelector } from '@/hooks/useAppSelector';
import { findPackage, formatINR } from '@/data/packagesCatalog';
import {
  colors,
  fontSize,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'PaymentResult'>;
type Props = NativeStackScreenProps<MainStackParamList, 'PaymentResult'>;

type PaymentState = 'loading' | 'success' | 'failure' | 'pending';

const LOADING_MS = 1500;

export const PaymentResultScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const { packageId } = route.params;
  const user = useAppSelector(state => state.auth.user);
  const pkg = findPackage(packageId);

  const [state, setState] = useState<PaymentState>('loading');
  const [failureReason, setFailureReason] = useState<string | null>(null);

  const runPayment = useCallback(() => {
    setState('loading');
    setFailureReason(null);

    // TODO: replace with real Razorpay SDK handoff + signature verify.
    // For dev: always succeed after LOADING_MS so the funnel can be tested
    // end-to-end. To exercise other branches manually, comment one of these
    // and uncomment another.
    const timer = setTimeout(() => {
      setState('success');
      // setState('failure'); setFailureReason('Card was declined.');
      // setState('pending');
    }, LOADING_MS);

    return () => clearTimeout(timer);
  }, []);

  // Kick off payment on mount.
  useEffect(() => {
    const cleanup = runPayment();
    return cleanup;
  }, [runPayment]);

  // Block Android hardware back while loading — exiting mid-payment would be
  // ambiguous (charged? not charged?). Only after we have a final state can
  // the user navigate away.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        return state === 'loading';
      });
      return () => sub.remove();
    }, [state]),
  );

  // Defensive: an unknown packageId shouldn't crash the screen.
  if (!pkg) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <XCircle size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Package not found</Text>
          <Text style={styles.errorBody}>
            That package couldn't be loaded. Pick a different one.
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryBtnText}>Back to packages</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Preparing secure payment…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.popToTop()}
          hitSlop={spacing.md}
          style={styles.backBtn}
        >
          <ChevronLeft size={layout.iconSize.lg} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {state === 'success' ? (
          <SuccessView pkg={pkg} email={user?.email ?? undefined} />
        ) : null}
        {state === 'failure' ? (
          <FailureView reason={failureReason} />
        ) : null}
        {state === 'pending' ? <PendingView /> : null}
      </View>

      <View style={styles.bottomBar}>
        {state === 'success' ? (
          <>
            <Pressable
              onPress={() => navigation.replace('ListProduct')}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>List your first product</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.popToTop()}
              hitSlop={spacing.md}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Back to home</Text>
            </Pressable>
          </>
        ) : null}

        {state === 'failure' ? (
          <>
            <Pressable
              onPress={runPayment}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>Try again</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={spacing.md}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>
                Pick a different pack
              </Text>
            </Pressable>
          </>
        ) : null}

        {state === 'pending' ? (
          <Pressable
            onPress={() => navigation.popToTop()}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>Go to home</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

// ---- State-specific views ----------------------------------------------------

interface SuccessViewProps {
  pkg: {
    name: string;
    priceInPaise: number;
    postSlots: number;
  };
  email?: string;
}

const SuccessView: React.FC<SuccessViewProps> = ({ pkg, email }) => (
  <>
    <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
      <CheckCircle2 size={72} color={colors.success} />
    </View>
    <Text style={styles.title}>Payment successful</Text>
    <Text style={styles.summary}>
      {pkg.name} Pack · {formatINR(pkg.priceInPaise)} · {pkg.postSlots}{' '}
      {pkg.postSlots === 1 ? 'slot' : 'slots'} added
    </Text>
    {email ? (
      <View style={styles.receiptRow}>
        <Mail size={layout.iconSize.sm} color={colors.textMuted} />
        <Text style={styles.receiptText}>
          GST receipt sent to {email}
        </Text>
      </View>
    ) : null}
  </>
);

const FailureView: React.FC<{ reason?: string | null }> = ({ reason }) => (
  <>
    <View style={[styles.iconCircle, styles.iconCircleFailure]}>
      <XCircle size={72} color={colors.error} />
    </View>
    <Text style={styles.title}>Payment didn't go through</Text>
    <Text style={styles.body}>
      {reason ?? "Something went wrong on the payment side."} {`\n`}
      Aapse koi paise nahi liye.
    </Text>
  </>
);

const PendingView: React.FC = () => (
  <>
    <View style={[styles.iconCircle, styles.iconCirclePending]}>
      <Clock size={72} color={colors.warning} />
    </View>
    <Text style={styles.title}>Payment status unclear</Text>
    <Text style={styles.body}>
      Agar paise kate hain, hum 30 min ke andar refund karenge ya pack
      activate kar denge. My Packages mein check kar sakte ho.
    </Text>
  </>
);

// ---- Styles ----

const ICON_CIRCLE = 120;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.base,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  iconCircle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
  iconCircleSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  iconCircleFailure: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  iconCirclePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  summary: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: fontSize.base * 1.6,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  receiptText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  errorBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
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
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    ...typography.button,
    color: colors.white,
  },
  secondaryBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryBtnText: {
    ...typography.label,
    color: colors.textSecondary,
  },
});
