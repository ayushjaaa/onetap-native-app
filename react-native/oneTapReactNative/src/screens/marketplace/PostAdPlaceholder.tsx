import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';

// Sentinel component for the Post tab. The CustomTabBar in MainNavigator
// intercepts taps on the Post tab and pushes the right seller-flow screen
// directly onto the parent stack, so this component should never be visible
// to the user. Rendered only as a defensive fallback (e.g. deep links).
export const PostAdPlaceholder: React.FC = () => {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
