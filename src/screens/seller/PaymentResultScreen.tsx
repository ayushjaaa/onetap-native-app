import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
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
import { formatINR } from '@/data/packagesCatalog';
import {
  useInitiatePackagePurchaseMutation,
  useVerifyPaymentMutation,
} from '@/api/walletApi';
import { mapApiError } from '@/utils/errorMapper';
import type { WalletPackage } from '@/types';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'PaymentResult'>;
type Props = NativeStackScreenProps<MainStackParamList, 'PaymentResult'>;

type PaymentState = 'loading' | 'success' | 'failure' | 'pending';

export const PaymentResultScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const { packageId } = route.params;
  const user = useAppSelector(state => state.auth.user);

  const [initiatePurchase] = useInitiatePackagePurchaseMutation();
  const [verifyPayment] = useVerifyPaymentMutation();

  const [state, setState] = useState<PaymentState>('loading');
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [pkg, setPkg] = useState<WalletPackage | null>(null);

  const runPayment = useCallback(async () => {
    setState('loading');
    setFailureReason(null);

    try {
      // 1. Server creates a real Razorpay order, priced from its own
      //    catalog — the client only ever sends packageId, never a price.
      const order = await initiatePurchase({ packageId }).unwrap();
      setPkg(order.package);

      // 2. Hand off to the native Razorpay Checkout SDK.
      const checkoutResult = await RazorpayCheckout.open({
        description: `${order.package.name} pack — ${order.package.postCredits} listing slots`,
        currency: order.currency,
        key: order.keyId,
        amount: String(order.amount),
        order_id: order.razorpayOrderId,
        name: 'OneTap365',
        prefill: {
          email: user?.email,
          name: user?.name,
        },
        theme: { color: colors.primary },
      });

      // 3. Confirm the signed payment with the backend. This never moves
      //    money itself — the wallet is credited by the verified webhook —
      //    it just authenticates the Checkout SDK's callback and reports
      //    where the order currently stands.
      const verifyResult = await verifyPayment({
        razorpay_order_id: checkoutResult.razorpay_order_id,
        razorpay_payment_id: checkoutResult.razorpay_payment_id,
        razorpay_signature: checkoutResult.razorpay_signature,
      }).unwrap();

      if (verifyResult.status === 'paid') {
        setState('success');
      } else if (verifyResult.status === 'processing') {
        setState('pending');
      } else {
        setState('failure');
        setFailureReason('Payment could not be confirmed.');
      }
    } catch (err) {
      // RazorpayCheckout.open rejects with { code, description } on
      // cancel/failure — a plain object, not an RTK Query error shape.
      const razorpayErr = err as { code?: number; description?: string };
      if (razorpayErr?.description) {
        setState('failure');
        setFailureReason(razorpayErr.description);
        return;
      }
      const mapped = mapApiError(err as never);
      setState('failure');
      setFailureReason(mapped.message);
    }
  }, [packageId, initiatePurchase, verifyPayment, user]);

  // Kick off payment on mount.
  useEffect(() => {
    void runPayment();
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

  // Defensive: `pkg` is only populated once initiatePurchase succeeds, so a
  // `success` state with no `pkg` would mean something internally
  // inconsistent happened. `failure`/`pending` states don't need `pkg` at
  // all (e.g. initiatePurchase itself can fail with pkg still null) and
  // must fall through to their own views below instead of showing this.
  if (state === 'success' && !pkg) {
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
        {state === 'success' && pkg ? (
          <SuccessView pkg={pkg} email={user?.email ?? undefined} />
        ) : null}
        {state === 'failure' ? <FailureView reason={failureReason} /> : null}
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
              <Text style={styles.secondaryBtnText}>Pick a different pack</Text>
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
    postCredits: number;
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
      {pkg.name} Pack · {formatINR(pkg.priceInPaise)} · {pkg.postCredits}{' '}
      {pkg.postCredits === 1 ? 'slot' : 'slots'} added
    </Text>
    {email ? (
      <View style={styles.receiptRow}>
        <Mail size={layout.iconSize.sm} color={colors.textMuted} />
        <Text style={styles.receiptText}>GST receipt sent to {email}</Text>
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
      {reason ?? 'Something went wrong on the payment side.'} {`\n`}
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
      Agar paise kate hain, hum 30 min ke andar refund karenge ya pack activate
      kar denge. My Packages mein check kar sakte ho.
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
