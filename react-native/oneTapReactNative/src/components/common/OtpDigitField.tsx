import React, { useEffect, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export interface OtpDigitFieldProps {
  value: string;
  onChangeText: (next: string) => void;
  /** Number of digit boxes to render. */
  length: number;
  hasError?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * A length-configurable OTP digit field (single-line of boxes with
 * auto-advance and paste support). Independent of the legacy 4-digit
 * `OtpInput`, which remains in use by the login flow until that flow
 * migrates to 6-digit OTPs alongside DLT template approval.
 */
export const OtpDigitField: React.FC<OtpDigitFieldProps> = ({
  value,
  onChangeText,
  length,
  hasError = false,
  autoFocus = true,
  disabled = false,
}) => {
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (autoFocus && !disabled) {
      const t = setTimeout(() => inputs.current[0]?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [autoFocus, disabled]);

  const handleChange = (text: string, index: number) => {
    // Paste of multiple digits: distribute and focus the trailing box.
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, length);
      onChangeText(digits);
      const lastIndex = Math.min(digits.length, length) - 1;
      if (lastIndex >= 0 && lastIndex < length - 1) {
        inputs.current[lastIndex + 1]?.focus();
      } else {
        inputs.current[length - 1]?.blur();
      }
      return;
    }

    const digit = text.replace(/\D/g, '');
    const chars = value.split('');
    chars[index] = digit;
    const next = chars.join('').slice(0, length);
    onChangeText(next);

    if (digit && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: { nativeEvent: { key: string } },
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const chars = value.split('');
      chars[index - 1] = '';
      onChangeText(chars.join(''));
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, i) => (
        <TextInput
          key={i}
          ref={(ref: TextInput | null) => {
            inputs.current[i] = ref;
          }}
          style={[
            styles.box,
            value[i] && styles.boxFilled,
            hasError && styles.boxError,
            disabled && styles.boxDisabled,
          ]}
          value={value[i] || ''}
          onChangeText={text => handleChange(text, i)}
          onKeyPress={e => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={i === 0 ? length : 1}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          editable={!disabled}
          selectionColor={colors.primary}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: spacing.sm,
  },
  box: {
    flex: 1,
    aspectRatio: 0.85,
    maxWidth: 56,
    borderRadius: radius.base,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
  },
  boxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.inputBackgroundFocus,
  },
  boxError: {
    borderColor: colors.error,
  },
  boxDisabled: {
    opacity: 0.6,
  },
});
