import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { MIN_PASSWORD_LENGTH } from '@/config/constants';
import { colors, spacing, typography } from '@/theme';

interface Props {
  password: string;
}

type Rule = {
  label: string;
  passed: boolean;
};

export const PasswordRequirements: React.FC<Props> = ({ password }) => {
  const rules: Rule[] = [
    {
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      passed: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      label: 'One uppercase letter (A–Z)',
      passed: /[A-Z]/.test(password),
    },
    {
      label: 'One number (0–9)',
      passed: /[0-9]/.test(password),
    },
    {
      label: 'One special character (!@#$…)',
      passed: /[^A-Za-z0-9]/.test(password),
    },
  ];

  return (
    <View style={styles.container} accessibilityLabel="Password requirements">
      {rules.map(rule => {
        const Icon = rule.passed ? Check : Circle;
        const tint = rule.passed ? colors.success : colors.textMuted;
        return (
          <View key={rule.label} style={styles.row}>
            <Icon size={16} color={tint} strokeWidth={rule.passed ? 3 : 2} />
            <Text
              style={[
                styles.label,
                { color: rule.passed ? colors.success : colors.textSecondary },
              ]}
            >
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    marginBottom: spacing.base,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    flexShrink: 1,
  },
});
