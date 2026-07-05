import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BaseToast,
  BaseToastProps,
  ToastConfig,
} from 'react-native-toast-message';
import { colors, radius, spacing, typography } from '@/theme';

const baseStyle = {
  borderLeftWidth: 4,
  borderRadius: radius.base,
  width: '92%' as const,
  height: 'auto' as const,
  paddingVertical: spacing.md,
  backgroundColor: colors.card,
};

const text1Style = {
  ...typography.bodyBold,
  color: colors.textPrimary,
};

const text2Style = {
  ...typography.caption,
  color: colors.textSecondary,
};

export const toastConfig: ToastConfig = {
  success: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={[baseStyle, { borderLeftColor: colors.success }]}
      contentContainerStyle={styles.content}
      text1Style={text1Style}
      text2Style={text2Style}
    />
  ),
  error: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={[baseStyle, { borderLeftColor: colors.error }]}
      contentContainerStyle={styles.content}
      text1Style={text1Style}
      text2Style={text2Style}
    />
  ),
  info: (props: BaseToastProps) => (
    <BaseToast
      {...props}
      style={[baseStyle, { borderLeftColor: colors.info }]}
      contentContainerStyle={styles.content}
      text1Style={text1Style}
      text2Style={text2Style}
    />
  ),
};

// Plain custom container fallback (in case BaseToast styling clashes)
export const CustomToast: React.FC<{
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}> = ({ type, title, message }) => {
  const borderColor =
    type === 'success'
      ? colors.success
      : type === 'error'
      ? colors.error
      : colors.info;
  return (
    <View style={[styles.customContainer, { borderLeftColor: borderColor }]}>
      <Text style={text1Style}>{title}</Text>
      {message ? <Text style={text2Style}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.base,
  },
  customContainer: {
    backgroundColor: colors.card,
    borderRadius: radius.base,
    borderLeftWidth: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    width: '92%',
  },
});
