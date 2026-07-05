import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';

interface StepIndicatorProps {
  current: number;
  total: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  current,
  total,
}) => {
  const progress = (current / total) * 100;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Step {current} of {total}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  track: {
    height: 4,
    backgroundColor: colors.card,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
