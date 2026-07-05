import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { colors, fontSize, layout, spacing } from '@/theme';

export interface TrendingHeaderProps {
  title?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const TrendingHeader: React.FC<TrendingHeaderProps> = ({
  title = 'Trending Now',
  actionLabel = 'More →',
  onActionPress,
  style,
}) => {
  return (
    <View style={[styles.row, style]}>
      <TrendingUp size={layout.iconSize.md} color={colors.warning} />
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
      {onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.white,
    marginLeft: spacing.sm,
  },
  spacer: {
    flex: 1,
  },
  action: {
    color: colors.primary,
    fontWeight: '700',
  },
});
