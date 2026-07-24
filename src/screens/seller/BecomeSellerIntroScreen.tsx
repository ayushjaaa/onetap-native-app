import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BadgeCheck,
  ChevronLeft,
  Clock,
  CreditCard,
  Package,
  ShieldCheck,
  Store,
  UploadCloud,
  XCircle,
} from 'lucide-react-native';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useGetWalletQuery } from '@/api/walletApi';
import { useLazyGetMeQuery } from '@/api/authApi';
import { setUser } from '@/store/authSlice';
import { useToast } from '@/hooks/useToast';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'BecomeSellerIntro'>;

interface StepCardConfig {
  number: string;
  Icon: typeof BadgeCheck;
  title: string;
  subtitle: string;
}

const STEPS: StepCardConfig[] = [
  {
    number: '1',
    Icon: BadgeCheck,
    title: 'Register as a seller',
    subtitle: 'Pick a seller type and fill your profile',
  },
  {
    number: '2',
    Icon: Package,
    title: 'Pick a package',
    subtitle: 'Starts at ₹49',
  },
  {
    number: '3',
    Icon: Clock,
    title: 'Wait for approval',
    subtitle: 'Our team manually verifies every seller',
  },
  {
    number: '4',
    Icon: UploadCloud,
    title: 'Post your product',
    subtitle: 'Goes live after admin review',
  },
];

export const BecomeSellerIntroScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const user = useAppSelector(state => state.auth.user);
  // Only needed to show real progress on step 2 ("Pick a package") — skip
  // the fetch entirely until the user has at least started onboarding.
  const { data: walletData, isLoading: walletLoading } = useGetWalletQuery(
    undefined,
    { skip: !user?.sellerType },
  );
  const [fetchMe, { isFetching: checkingStatus }] = useLazyGetMeQuery();

  // Wallet is the only source for `hasCredits`, which every step/CTA
  // decision below depends on — without this, a seller who already bought a
  // package briefly renders as if still on "Pick a package" on every mount.
  const pendingWalletCheck = Boolean(user?.sellerType) && walletLoading;

  const sellerType = user?.sellerType;
  const profileSubmitted = Boolean(user?.sellerProfileSubmitted);
  const hasCredits = (walletData?.wallet.postCredits ?? 0) > 0;
  const sellerActive = Boolean(user?.isSellerApproved);
  const onboardingStarted = Boolean(sellerType);
  // Admin can reject at any point after profile submission — doesn't
  // require a package purchase first — so this is checked independently of
  // `hasCredits`, and takes priority over "waiting" below (it's terminal,
  // not "still in progress"; there's no resubmission path).
  const rejected = Boolean(user?.sellerRejected);
  // Package bought, waiting on the admin `identity:kyc_verified` grant —
  // this is the real, only gate on posting; nothing in this flow can skip it.
  const awaitingApproval =
    profileSubmitted && hasCredits && !sellerActive && !rejected;

  useEffect(() => {
    if (sellerActive) {
      // Just got approved — send them straight into the listing form so
      // they can post immediately, instead of dropping them on Home.
      navigation.replace('ListProduct');
    }
  }, [sellerActive, navigation]);

  // Index of the step the user should do next — drives both the CTA
  // destination and which step card is highlighted as "current".
  const currentStepIndex = !profileSubmitted
    ? 0
    : !hasCredits
    ? 1
    : !sellerActive
    ? 2
    : 3;

  const stepDone = [profileSubmitted, hasCredits, sellerActive, false];

  const ctaLabel = !onboardingStarted
    ? 'Get started'
    : awaitingApproval
    ? 'Check approval status'
    : 'Continue setup';

  const handleCheckStatus = async () => {
    try {
      const res = await fetchMe().unwrap();
      dispatch(setUser(res.data.user));
      // Check the raw fields from this response, not the Redux-derived
      // flags — those only update after this dispatch flows through to the
      // next render, so `user.isSellerApproved` here would still be stale.
      const approved = Boolean(
        res.data.user?.permissions?.includes('identity:kyc_verified'),
      );
      const nowRejected = res.data.user?.kycStatus === 'rejected';
      if (nowRejected) {
        toast.error({
          title: 'Application not approved',
          message:
            res.data.user?.kycRejectionReason ??
            'Your seller application was not approved.',
        });
      } else if (!approved) {
        toast.info({
          title: 'Still under review',
          message: "We'll notify you the moment your account is approved.",
        });
      }
    } catch {
      toast.error({
        title: "Couldn't check status",
        message: 'Please try again in a moment.',
      });
    }
  };

  const handleStart = async () => {
    // Resume at the next incomplete step instead of always restarting at
    // seller-type selection — mirrors the backend's real order: pick type →
    // submit profile → buy a package → wait for admin KYC approval. Posting
    // is blocked server-side (`listing:create` requires `identity:kyc_verified`)
    // until an admin approves, so this screen refuses to route past that gate.
    // Rejected is terminal — nothing to navigate to.
    if (rejected) return;
    if (!sellerType) {
      navigation.navigate('SellerType');
    } else if (!profileSubmitted) {
      navigation.navigate('IndividualOnboarding');
    } else if (!hasCredits) {
      navigation.navigate('PackageSelection');
    } else if (awaitingApproval) {
      await handleCheckStatus();
    }
  };

  return (
    <SafeAreaView
      testID="become-seller-intro-screen"
      style={styles.safe}
      edges={['top']}
    >
      <View style={styles.topBar}>
        <Pressable
          onPress={navigation.goBack}
          hitSlop={spacing.md}
          style={styles.backBtn}
        >
          <ChevronLeft size={layout.iconSize.lg} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <View style={styles.heroCircle}>
            <Store size={56} color={colors.primary} />
          </View>
          <Text style={styles.heading}>Sell on OneTap in 4 steps</Text>
        </View>

        {pendingWalletCheck ? (
          <View style={styles.stepsLoading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View style={styles.stepsWrap}>
            {STEPS.map((step, index) => {
              const done = stepDone[index];
              const isCurrent =
                !done && onboardingStarted && index === currentStepIndex;
              const isRejectedStep = rejected && index === currentStepIndex;
              return (
                <View
                  key={step.number}
                  style={[
                    styles.stepCard,
                    done && styles.stepCardDone,
                    isCurrent && styles.stepCardCurrent,
                    isRejectedStep && styles.stepCardRejected,
                  ]}
                >
                  <View
                    style={[
                      styles.stepNumberCircle,
                      done && styles.stepNumberCircleDone,
                      isCurrent && styles.stepNumberCircleCurrent,
                      isRejectedStep && styles.stepNumberCircleRejected,
                    ]}
                  >
                    {isRejectedStep ? (
                      <XCircle size={18} color={colors.white} />
                    ) : (
                      <Text
                        style={[
                          styles.stepNumberText,
                          (done || isCurrent) && styles.stepNumberTextDone,
                        ]}
                      >
                        {done ? '✓' : step.number}
                      </Text>
                    )}
                  </View>
                  <View style={styles.stepIconWrap}>
                    <step.Icon
                      size={layout.iconSize.base}
                      color={isRejectedStep ? colors.error : colors.primary}
                    />
                  </View>
                  <View style={styles.stepTextWrap}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text
                      style={[
                        styles.stepSubtitle,
                        isRejectedStep && styles.stepSubtitleRejected,
                      ]}
                    >
                      {isRejectedStep
                        ? 'Application not approved'
                        : isCurrent
                        ? "You're here"
                        : step.subtitle}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.reassuranceRow}>
          <View style={styles.reassuranceItem}>
            <ShieldCheck size={layout.iconSize.sm} color={colors.success} />
            <Text style={styles.reassuranceText}>
              Manually verified sellers
            </Text>
          </View>
          <View style={styles.reassuranceDot} />
          <View style={styles.reassuranceItem}>
            <CreditCard size={layout.iconSize.sm} color={colors.info} />
            <Text style={styles.reassuranceText}>No card needed</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {rejected ? (
          <Text
            testID="become-seller-rejected-hint"
            style={styles.rejectedHint}
          >
            Your seller application wasn't approved.
            {user?.kycRejectionReason
              ? ` Reason: ${user.kycRejectionReason}`
              : ''}{' '}
            There's no way to resubmit in-app — please contact support if you
            think this is a mistake.
          </Text>
        ) : (
          <>
            {!pendingWalletCheck && awaitingApproval && (
              <Text style={styles.waitingHint}>
                Your account is under review. You can't post a product until an
                admin approves it.
              </Text>
            )}
            <Pressable
              testID="become-seller-cta-button"
              onPress={handleStart}
              disabled={checkingStatus || pendingWalletCheck}
              style={({ pressed }) => [
                styles.primaryBtn,
                (checkingStatus || pendingWalletCheck) &&
                  styles.primaryBtnDisabled,
                pressed &&
                  !checkingStatus &&
                  !pendingWalletCheck &&
                  styles.primaryBtnPressed,
              ]}
            >
              {checkingStatus || pendingWalletCheck ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>{ctaLabel}</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const HERO_CIRCLE = 120;
const STEP_NUMBER_CIRCLE = 32;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
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
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroWrap: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  heroCircle: {
    width: HERO_CIRCLE,
    height: HERO_CIRCLE,
    borderRadius: HERO_CIRCLE / 2,
    backgroundColor: colors.primaryAlpha15,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  heading: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stepsWrap: {
    gap: spacing.md,
  },
  stepsLoading: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.md,
  },
  stepCardDone: {
    borderColor: colors.success,
  },
  stepCardCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha10,
  },
  stepCardRejected: {
    borderColor: colors.error,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  stepNumberCircle: {
    width: STEP_NUMBER_CIRCLE,
    height: STEP_NUMBER_CIRCLE,
    borderRadius: STEP_NUMBER_CIRCLE / 2,
    backgroundColor: colors.primaryAlpha15,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberCircleDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepNumberCircleCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNumberCircleRejected: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  stepNumberText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.primary,
  },
  stepNumberTextDone: {
    color: colors.white,
  },
  stepIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryAlpha10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  stepSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing['2xs'],
  },
  stepSubtitleRejected: {
    color: colors.error,
    fontWeight: '600',
  },
  reassuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  reassuranceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reassuranceText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  reassuranceDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  waitingHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  rejectedHint: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
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
