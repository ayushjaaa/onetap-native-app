import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { layout } from '@/theme/spacing';
import { PHONE_LENGTH, PHONE_PREFIX } from '@/config/constants';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: string;
  successMessage?: string;
  label?: string;
  required?: boolean;
}

export const PhoneInput = forwardRef<TextInput, PhoneInputProps>(
  (
    {
      value,
      onChangeText,
      onBlur,
      error,
      successMessage,
      label,
      required = false,
    },
    ref,
  ) => {
    const [focused, setFocused] = React.useState(false);

    const borderColor = focused
      ? colors.borderFocus
      : error
      ? colors.borderError
      : successMessage
      ? colors.borderSuccess
      : colors.border;

    const handleChange = (text: string) => {
      // Strip non-digits, max 10 chars
      const digits = text.replace(/\D/g, '').slice(0, PHONE_LENGTH);
      onChangeText(digits);
    };

    return (
      <View style={styles.container}>
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.requiredMark}> *</Text>}
          </Text>
        )}

        <View style={[styles.wrapper, { borderColor }]}>
          <View style={styles.prefixBox}>
            <Text style={styles.prefix}>{PHONE_PREFIX}</Text>
          </View>
          <View style={styles.divider} />
          <TextInput
            ref={ref}
            style={styles.input}
            placeholder="Mobile Number"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={PHONE_LENGTH}
            value={value}
            onChangeText={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              onBlur?.();
            }}
            selectionColor={colors.primary}
          />
        </View>

        {error ? (
          <Text style={[styles.message, styles.errorText]}>✕ {error}</Text>
        ) : successMessage ? (
          <Text style={[styles.message, styles.successText]}>
            ✓ {successMessage}
          </Text>
        ) : null}
      </View>
    );
  },
);

PhoneInput.displayName = 'PhoneInput';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.base,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  requiredMark: {
    color: colors.error,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.inputHeight,
    backgroundColor: colors.white,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
  },
  prefixBox: {
    paddingRight: spacing.sm,
  },
  prefix: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    marginHorizontal: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.black,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  message: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.error,
  },
  successText: {
    color: colors.success,
  },
});
