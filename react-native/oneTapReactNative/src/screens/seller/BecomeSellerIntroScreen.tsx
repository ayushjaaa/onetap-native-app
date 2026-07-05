import React, { useEffect } from 'react';
import {
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
  CreditCard,
  Package,
  ShieldCheck,
  Store,
  UploadCloud,
} from 'lucide-react-native';
import { useAppSelector } from '@/hooks/useAppSelector';
import {
  colors,
  fontSize,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme';
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
    title: 'Verify Aadhaar',
    subtitle: '60 seconds',
  },
  {
    number: '2',
    Icon: Package,
    title: 'Pick a package',
    subtitle: 'Starts at ₹49',
  },
  {
    number: '3',
    Icon: UploadCloud,
    title: 'Post your product',
    subtitle: 'Goes live after admin review',
  },
];

export const BecomeSellerIntroScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const user = useAppSelector(state => state.auth.user);

  const aadhaarDone = Boolean(user?.aadhaarVerified);
  const sellerActive = Boolean(user?.isSellerApproved);

  useEffect(() => {
    if (sellerActive) {
      // Already a seller — bounce them to MyAds without polluting back stack.
      navigation.replace('Tabs');
    }
  }, [sellerActive, navigation]);

  const ctaLabel = aadhaarDone ? 'Continue setup' : 'Get started';

  const handleStart = () => {
    if (aadhaarDone) {
      // TODO: when S6 (PackageSelection) ships, route to it here.
      // For now, treat resume the same as a fresh start (re-enter Aadhaar
      // flow is harmless because backend dedup will short-circuit it).
      navigation.navigate('AadhaarNumber');
      return;
    }
    navigation.navigate('AadhaarNumber');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
          <Text style={styles.heading}>Sell on OneTap in 3 steps</Text>
        </View>

        <View style={styles.stepsWrap}>
          {STEPS.map((step, index) => {
            const stepDone = index === 0 && aadhaarDone;
            return (
              <View
                key={step.number}
                style={[styles.stepCard, stepDone && styles.stepCardDone]}
              >
                <View
                  style={[
                    styles.stepNumberCircle,
                    stepDone && styles.stepNumberCircleDone,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumberText,
                      stepDone && styles.stepNumberTextDone,
                    ]}
                  >
                    {stepDone ? '✓' : step.number}
                  </Text>
                </View>
                <View style={styles.stepIconWrap}>
                  <step.Icon
                    size={layout.iconSize.base}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.stepTextWrap}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.reassuranceRow}>
          <View style={styles.reassuranceItem}>
            <ShieldCheck size={layout.iconSize.sm} color={colors.success} />
            <Text style={styles.reassuranceText}>Aadhaar secured</Text>
          </View>
          <View style={styles.reassuranceDot} />
          <View style={styles.reassuranceItem}>
            <CreditCard size={layout.iconSize.sm} color={colors.info} />
            <Text style={styles.reassuranceText}>No card needed</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleStart}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
          ]}
        >
          <Text style={styles.primaryBtnText}>{ctaLabel}</Text>
        </Pressable>
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
});
