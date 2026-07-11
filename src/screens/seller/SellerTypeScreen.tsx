import React, { useEffect, useState } from 'react';
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
  Briefcase,
  ChevronLeft,
  Lock,
  User as UserIcon,
} from 'lucide-react-native';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useToast } from '@/hooks/useToast';
import { useSetSellerTypeMutation } from '@/api/authApi';
import { mapApiError } from '@/utils/errorMapper';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'SellerType'>;

type SellerType = 'individual' | 'wholesale';

// Feature flag for v1 — wholesale onboarding ships in Phase 2.
const WHOLESALE_ENABLED = false;

interface TypeCardConfig {
  type: SellerType;
  Icon: typeof UserIcon;
  title: string;
  bullets: string[];
}

const INDIVIDUAL: TypeCardConfig = {
  type: 'individual',
  Icon: UserIcon,
  title: 'Individual seller',
  bullets: [
    'Activate instantly',
    'India mein kahin bhi bechen',
    'Koi extra fee nahi',
  ],
};

const WHOLESALE: TypeCardConfig = {
  type: 'wholesale',
  Icon: Briefcase,
  title: 'Wholesale seller',
  bullets: ['GST-registered businesses', 'Bulk listings + priority'],
};

export const SellerTypeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const user = useAppSelector(state => state.auth.user);

  const [selected, setSelected] = useState<SellerType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [setSellerTypeMutation] = useSetSellerTypeMutation();

  // Defensive: a seller who already picked a type (registered) shouldn't
  // land back here and be walked through registering again — resume at
  // whatever's actually next instead. Catches stale nav-stack entries, not
  // just fresh navigations (those are already routed correctly upstream by
  // `resolvePostAdDestination` / `BecomeSellerIntroScreen`).
  useEffect(() => {
    if (user?.isSellerApproved) {
      navigation.popToTop();
    } else if (user?.sellerType) {
      if (!user.sellerProfileSubmitted) {
        navigation.replace('IndividualOnboarding');
      } else {
        navigation.replace('BecomeSellerIntro');
      }
    }
  }, [
    user?.isSellerApproved,
    user?.sellerType,
    user?.sellerProfileSubmitted,
    navigation,
  ]);

  const handleWholesaleTap = () => {
    toast.info({
      title: 'Coming in Phase 2',
      message: 'Wholesale onboarding launches with GST + bulk listing support.',
    });
  };

  const handleContinue = async () => {
    if (selected !== 'individual' || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await setSellerTypeMutation({ sellerType: 'individual' }).unwrap();

      // `replace` so the user can't back-button into the type-selection
      // step after committing to Individual.
      navigation.replace('IndividualOnboarding');
    } catch (err) {
      const mapped = mapApiError(err as never);
      toast.error({
        title: "Couldn't save your selection",
        message: mapped.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Text style={styles.headerTitle}>Choose seller type</Text>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>Step 3/3</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subCopy}>
          Aap baad mein profile se change kar sakte ho
        </Text>

        {/* Individual card */}
        <SellerTypeCard
          config={INDIVIDUAL}
          selected={selected === 'individual'}
          onPress={() => setSelected('individual')}
        />

        {/* Wholesale card — disabled in v1 */}
        <SellerTypeCard
          config={WHOLESALE}
          disabled={!WHOLESALE_ENABLED}
          onPress={
            WHOLESALE_ENABLED
              ? () => setSelected('wholesale')
              : handleWholesaleTap
          }
        />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleContinue}
          disabled={selected !== 'individual' || isSubmitting}
          style={({ pressed }) => [
            styles.primaryBtn,
            (selected !== 'individual' || isSubmitting) &&
              styles.primaryBtnDisabled,
            pressed && selected === 'individual' && styles.primaryBtnPressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Continue</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

interface SellerTypeCardProps {
  config: TypeCardConfig;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

const SellerTypeCard: React.FC<SellerTypeCardProps> = ({
  config,
  selected = false,
  disabled = false,
  onPress,
}) => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        disabled && styles.cardDisabled,
        pressed && !disabled && styles.cardPressed,
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[styles.cardIconWrap, disabled && styles.cardIconWrapDisabled]}
        >
          <config.Icon
            size={layout.iconSize.base}
            color={disabled ? colors.textMuted : colors.primary}
          />
        </View>

        <View style={styles.cardTitleWrap}>
          <Text style={[styles.cardTitle, disabled && styles.textDisabled]}>
            {config.title}
          </Text>
        </View>

        {disabled ? (
          <View style={styles.comingSoonPill}>
            <Lock size={layout.iconSize.sm} color={colors.warning} />
            <Text style={styles.comingSoonText}>Coming soon</Text>
          </View>
        ) : (
          <View
            style={[styles.radio, selected && styles.radioSelected]}
            pointerEvents="none"
          >
            {selected ? <View style={styles.radioDot} /> : null}
          </View>
        )}
      </View>

      <View style={styles.bullets}>
        {config.bullets.map(text => (
          <View key={text} style={styles.bulletRow}>
            <View
              style={[styles.bulletDot, disabled && styles.bulletDotDisabled]}
            />
            <Text style={[styles.bulletText, disabled && styles.textDisabled]}>
              {text}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
};

const ICON_CIRCLE = 44;
const RADIO_SIZE = 22;

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
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  subCopy: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    padding: spacing.base,
    gap: spacing.md,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha10,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIconWrap: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    backgroundColor: colors.primaryAlpha15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrapDisabled: {
    backgroundColor: colors.whiteAlpha04,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  textDisabled: {
    color: colors.textMuted,
  },
  comingSoonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  comingSoonText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.warning,
  },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    borderRadius: RADIO_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: RADIO_SIZE / 2,
    height: RADIO_SIZE / 2,
    borderRadius: RADIO_SIZE / 4,
    backgroundColor: colors.primary,
  },
  bullets: {
    gap: spacing.xs,
    paddingLeft: ICON_CIRCLE + spacing.md,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  bulletDotDisabled: {
    backgroundColor: colors.textMuted,
  },
  bulletText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
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
