import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { passwordStrength } from '@/utils/validators';
import { colors, spacing, typography } from '@/theme';

interface Props {
  password: string;
}

export const PasswordStrengthBar: React.FC<Props> = ({ password }) => {
  if (!password) return null;

  const { score, label } = passwordStrength(password);
  const colorMap: Record<number, string> = {
    0: colors.error,
    1: colors.error,
    2: colors.warning,
    3: colors.success,
    4: colors.primary,
  };
  const fillColor = colorMap[score];

  return (
    <View style={styles.container}>
      <View style={styles.barRow}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < score ? fillColor : colors.border },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: fillColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: -spacing.sm,
    marginBottom: spacing.base,
  },
  barRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
