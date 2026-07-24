import React, { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { OTP_LENGTH } from '@/config/constants';

interface OtpInputProps {
  value: string;
  onChangeText: (text: string) => void;
  hasError?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

// Box size derived from screen width so all OTP_LENGTH boxes always fit
// on-screen instead of overflowing off the side on narrower devices.
const CONTAINER_PADDING = spacing.xl * 2;
const BOX_GAP = spacing.sm;
const availableWidth =
  Dimensions.get('window').width -
  CONTAINER_PADDING -
  BOX_GAP * (OTP_LENGTH - 1);
const BOX_SIZE = Math.min(60, Math.floor(availableWidth / OTP_LENGTH));

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChangeText,
  hasError = false,
  autoFocus = true,
  disabled = false,
}) => {
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputs.current[0]?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const handleChange = (text: string, index: number) => {
    // Handle paste of full OTP
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
      onChangeText(digits.padEnd(value.length, '').slice(0, OTP_LENGTH));
      const lastFilled = Math.min(digits.length, OTP_LENGTH) - 1;
      if (lastFilled >= 0 && lastFilled < OTP_LENGTH - 1) {
        inputs.current[lastFilled + 1]?.focus();
      } else {
        inputs.current[OTP_LENGTH - 1]?.blur();
      }
      return;
    }

    // Single digit input
    const digit = text.replace(/\D/g, '');
    const chars = value.split('');
    chars[index] = digit;
    const next = chars.join('').slice(0, OTP_LENGTH);
    onChangeText(next);

    if (digit && index < OTP_LENGTH - 1) {
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
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <TextInput
          key={i}
          testID={`otp-box-${i}`}
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
          maxLength={i === 0 ? OTP_LENGTH : 1}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          selectionColor={colors.primary}
          editable={!disabled}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: BOX_GAP,
    paddingHorizontal: spacing.xl,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
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
    opacity: 0.5,
  },
});
