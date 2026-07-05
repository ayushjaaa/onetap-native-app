import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const variantStyles = getVariantStyles(variant, isDisabled);
  const sizeStyles = getSizeStyles(size);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color} size="small" />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text
            style={[
              styles.text,
              variantStyles.text,
              sizeStyles.text,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
};

const getVariantStyles = (variant: ButtonVariant, isDisabled: boolean) => {
  if (isDisabled) {
    return {
      container: { backgroundColor: colors.primary, opacity: 0.5 },
      text: { color: colors.white },
    };
  }
  switch (variant) {
    case 'primary':
      return {
        container: { backgroundColor: colors.primary },
        text: { color: colors.white },
      };
    case 'secondary':
      return {
        container: { backgroundColor: colors.card },
        text: { color: colors.textPrimary },
      };
    case 'outline':
      return {
        container: {
          backgroundColor: colors.transparent,
          borderWidth: 1,
          borderColor: colors.border,
        },
        text: { color: colors.textPrimary },
      };
    case 'ghost':
      return {
        container: { backgroundColor: colors.transparent },
        text: { color: colors.primary },
      };
  }
};

const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case 'sm':
      return {
        container: { height: 40, paddingHorizontal: spacing.base },
        text: { fontSize: 13 },
      };
    case 'md':
      return {
        container: { height: 48, paddingHorizontal: spacing.lg },
        text: { fontSize: 15 },
      };
    case 'lg':
      return {
        container: { height: 56, paddingHorizontal: spacing.xl },
        text: { fontSize: 16 },
      };
  }
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  text: {
    ...typography.button,
    textAlign: 'center',
  },
});
