import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, fontSize, layout, radius, spacing } from '@/theme';

export interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  subtitle,
  onPress,
  style,
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.inner}>
        <Icon size={layout.iconSize.lg} color={colors.primary} />
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    height: layout.featureCardHeight,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    borderColor: colors.primary,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: fontSize.sm,
  },
  subtitle: {
    fontSize: fontSize['2xs'],
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: fontSize.xs,
  },
});
