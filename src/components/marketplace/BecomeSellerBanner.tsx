import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BadgeCheck, ChevronRight } from 'lucide-react-native';
import {
  colors,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme';

export type BecomeSellerBannerState = 'default' | 'resume';

export interface BecomeSellerBannerProps {
  state: BecomeSellerBannerState;
  onPress: () => void;
}

interface CopyVariant {
  title: string;
  subtitle: string;
  cta: string;
}

const COPY: Record<BecomeSellerBannerState, CopyVariant> = {
  default: {
    title: 'Start selling on OneTap',
    subtitle: 'Aadhaar verified · 1-tap setup',
    cta: 'Get started',
  },
  resume: {
    title: 'Finish your seller setup',
    subtitle: '1 step left to start selling',
    cta: 'Finish setup',
  },
};

export const BecomeSellerBanner: React.FC<BecomeSellerBannerProps> = ({
  state,
  onPress,
}) => {
  const copy = COPY[state];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${copy.title}. ${copy.cta}`}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
    >
      <View style={styles.iconWrap}>
        <BadgeCheck size={layout.iconSize.base} color={colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>
      <View style={styles.ctaWrap}>
        <Text style={styles.ctaText}>{copy.cta}</Text>
        <ChevronRight size={layout.iconSize.sm} color={colors.primary} />
      </View>
    </Pressable>
  );
};

const ICON_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.md,
  },
  containerPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: colors.primaryAlpha15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing['2xs'],
  },
  ctaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
  },
  ctaText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
});
