import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { colors, spacing, typography } from '@/theme';

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Internet connection check karein</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
});
