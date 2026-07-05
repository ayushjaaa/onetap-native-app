import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  Bell,
  Briefcase,
  ChevronLeft,
  Hourglass,
  LineChart,
} from 'lucide-react-native';
import { useToast } from '@/hooks/useToast';
import {
  colors,
  fontSize,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ComingSoon'>;
type Props = NativeStackScreenProps<MainStackParamList, 'ComingSoon'>;

type FeatureKey = 'service' | 'bid' | 'sip';

interface FeatureMeta {
  title: string;
  Icon: typeof Hourglass;
}

const FEATURE_META: Record<FeatureKey, FeatureMeta> = {
  service: { title: 'Book a Service', Icon: Briefcase },
  bid: { title: 'Property Bidding', Icon: Hourglass },
  sip: { title: 'SIP Investment', Icon: LineChart },
};

export const ComingSoonScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const { featureKey } = route.params;

  const meta = FEATURE_META[featureKey];

  const [notify, setNotify] = useState(false);

  const handleToggleNotify = (next: boolean) => {
    setNotify(next);
    toast.info({
      title: next ? "We'll let you know!" : 'Notifications off',
      message: next
        ? `We'll ping you the moment ${meta.title} goes live.`
        : `You won't be notified about ${meta.title}.`,
    });
  };

  const handleBackToHome = () => {
    navigation.popToTop();
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

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <meta.Icon size={56} color={colors.primary} />
        </View>

        <Text style={styles.featureTitle}>{meta.title}</Text>
        <Text style={styles.subtitle}>Coming soon in Phase 2</Text>

        <Text style={styles.body}>
          Hum is feature ko polish kar rahe hain.{`\n`}
          Jaise hi launch hoga, aapko hum batayenge.
        </Text>

        <View style={styles.notifyCard}>
          <View style={styles.notifyLeft}>
            <View style={styles.notifyIconWrap}>
              <Bell size={layout.iconSize.md} color={colors.primary} />
            </View>
            <View style={styles.notifyTextWrap}>
              <Text style={styles.notifyTitle}>Notify me when this launches</Text>
              <Text style={styles.notifyHint}>
                Ek tap se launch alert on
              </Text>
            </View>
          </View>
          <Switch
            value={notify}
            onValueChange={handleToggleNotify}
            trackColor={{
              false: colors.border,
              true: colors.primaryAlpha30,
            }}
            thumbColor={notify ? colors.primary : colors.textDisabled}
          />
        </View>
      </View>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleBackToHome}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
          ]}
        >
          <Text style={styles.primaryBtnText}>Back to home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const ICON_CIRCLE = 120;

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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    backgroundColor: colors.primaryAlpha15,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  featureTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.h4,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: fontSize.base * 1.6,
  },
  notifyCard: {
    marginTop: spacing['2xl'],
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  notifyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  notifyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryAlpha10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyTextWrap: {
    flex: 1,
  },
  notifyTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  notifyHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing['2xs'],
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
