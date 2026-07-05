import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius } from '@/theme';

interface ShimmerProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, {
        duration: 900,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius } as ViewStyle,
        animatedStyle,
        style,
      ]}
    />
  );
};

/**
 * A pre-composed card skeleton — useful for Home/list placeholders.
 */
export const ShimmerCard: React.FC = () => {
  return (
    <View style={styles.card}>
      <Shimmer width="60%" height={16} />
      <View style={styles.gap} />
      <Shimmer width="100%" height={120} borderRadius={radius.md} />
      <View style={styles.gap} />
      <Shimmer width="80%" height={12} />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  gap: {
    height: 8,
  },
});
