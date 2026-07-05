import React from 'react';
import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '@/theme';

interface LoaderProps {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export const Loader: React.FC<LoaderProps> = ({
  size = 'large',
  color = colors.primary,
  fullScreen = false,
  style,
}) => {
  return (
    <View style={[fullScreen ? styles.fullScreen : styles.inline, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
