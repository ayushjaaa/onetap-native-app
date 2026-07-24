import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '@/hooks/useAppSelector';
import { resolvePostAdDestination } from '@/navigation/postAdRouter';
import { colors } from '@/theme';

// Sentinel component for the Post tab. The CustomTabBar in MainNavigator
// intercepts taps on the Post tab and pushes the right seller-flow screen
// directly onto the parent stack, so this component normally isn't visible.
// It's still a real registered route though (deep link, `navigate('Post')`
// bypassing the tab bar), so it self-redirects on mount instead of being a
// dead end with a permanently-spinning indicator and no way out.
export const PostAdPlaceholder: React.FC = () => {
  const navigation = useNavigation();
  const user = useAppSelector(state => state.auth.user);

  useEffect(() => {
    const destination = resolvePostAdDestination(user);
    navigation.getParent()?.navigate(destination as never);
  }, [navigation, user]);

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
