import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { layout } from '@/theme/spacing';

export type InputState = 'default' | 'error' | 'success';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  successMessage?: string;
  helperText?: string;
  state?: InputState;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      successMessage,
      helperText,
      state,
      leftIcon,
      rightIcon,
      containerStyle,
      required = false,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);

    const resolvedState: InputState = error
      ? 'error'
      : successMessage
      ? 'success'
      : state || 'default';

    const borderColor = focused
      ? colors.borderFocus
      : resolvedState === 'error'
      ? colors.borderError
      : resolvedState === 'success'
      ? colors.borderSuccess
      : colors.border;

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.requiredMark}> *</Text>}
          </Text>
        )}

        <View style={[styles.inputWrapper, { borderColor }]}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            style={styles.input}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            onFocus={e => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={e => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>

        {error ? (
          <Text style={[styles.message, styles.errorText]}>✕ {error}</Text>
        ) : successMessage ? (
          <Text style={[styles.message, styles.successText]}>
            ✓ {successMessage}
          </Text>
        ) : helperText ? (
          <Text style={[styles.message, styles.helperText]}>{helperText}</Text>
        ) : null}
      </View>
    );
  },
);

Input.displayName = 'Input';

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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.inputHeight,
    backgroundColor: colors.inputBackground,
    borderRadius: radius.base,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
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
  helperText: {
    color: colors.textMuted,
  },
});
