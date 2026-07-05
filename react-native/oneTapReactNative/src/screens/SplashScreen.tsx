import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '@/theme';
import { APP_NAME } from '@/config/constants';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const FULL_TEXT = APP_NAME; // OneTap365
const ONE_TAP_PART = 'OneTap'; // first 6 chars
const ICONS = ['🛍️', '🚗', '🏠', '💻', '📱', '🪑'];

export const SplashScreen: React.FC = () => {
  // ---- Ripple ----
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0.6);

  // ---- Floating icons ----
  const iconProgress = useSharedValue(0);

  // ---- Logo ----
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);

  // ---- Typewriter ----
  const [displayedText, setDisplayedText] = useState('');

  // ---- Tagline + dots ----
  const taglineOpacity = useSharedValue(0);

  // ---- Pulse on brand text ----
  const brandPulse = useSharedValue(1);

  useEffect(() => {
    // Sequence mirrors the Flutter version

    // 1) Ripple — fires immediately, 1.2s
    rippleScale.value = withTiming(1, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
    rippleOpacity.value = withTiming(0, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });

    // 2) Typewriter — starts after 400ms, runs ~1200ms
    const typeTimer = setTimeout(() => {
      const total = FULL_TEXT.length;
      const stepMs = 1200 / total;
      let i = 0;
      const interval = setInterval(() => {
        i += 1;
        setDisplayedText(FULL_TEXT.slice(0, i));
        if (i >= total) clearInterval(interval);
      }, stepMs);
    }, 400);

    // 3) Floating icons — starts after 600ms, runs ~2000ms
    const iconTimer = setTimeout(() => {
      iconProgress.value = withTiming(1, {
        duration: 2000,
        easing: Easing.out(Easing.cubic),
      });
    }, 600);

    // 4) Logo — fades in after 1200ms (after typewriter starts settling)
    const logoTimer = setTimeout(() => {
      logoOpacity.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
      logoScale.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    }, 1200);

    // 5) Tagline + bottom dots fade in
    const taglineTimer = setTimeout(() => {
      taglineOpacity.value = withTiming(1, { duration: 800 });
    }, 1600);

    // 6) Continuous brand pulse
    brandPulse.value = withRepeat(
      withSequence(
        withTiming(1.08, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );

    return () => {
      clearTimeout(typeTimer);
      clearTimeout(iconTimer);
      clearTimeout(logoTimer);
      clearTimeout(taglineTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Animated styles ----
  const outerRippleStyle = useAnimatedStyle(() => ({
    width: 200 * rippleScale.value,
    height: 200 * rippleScale.value,
    borderRadius: 100 * rippleScale.value,
    opacity: rippleOpacity.value,
  }));

  const innerRippleStyle = useAnimatedStyle(() => ({
    width: 140 * rippleScale.value,
    height: 140 * rippleScale.value,
    borderRadius: 70 * rippleScale.value,
    opacity: rippleOpacity.value * 0.5,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const brandStyle = useAnimatedStyle(() => ({
    transform: [{ scale: brandPulse.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Floating marketplace icons */}
      {ICONS.map((icon, index) => (
        <FloatingIcon
          key={index}
          icon={icon}
          index={index}
          progress={iconProgress}
        />
      ))}

      {/* Ripple effects (behind content) */}
      <View style={styles.rippleWrapper} pointerEvents="none">
        <Animated.View style={[styles.ripple, outerRippleStyle]} />
        <Animated.View style={[styles.ripple, innerRippleStyle]} />
      </View>

      {/* Center content */}
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            source={require('@/assets/icons/img.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Brand text with typewriter */}
        <Animated.View style={[styles.brandRow, brandStyle]}>
          <Text style={styles.brandWhite}>
            {displayedText.slice(0, ONE_TAP_PART.length)}
          </Text>
          <Text style={styles.brandPrimary}>
            {displayedText.slice(ONE_TAP_PART.length)}
          </Text>
          {displayedText.length < FULL_TEXT.length && (
            <View style={styles.cursor} />
          )}
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[styles.taglineWrap, taglineStyle]}>
          <Text style={styles.tagline}>
            Buy, Sell, Discover – All in One Place!
          </Text>
        </Animated.View>
      </View>

      {/* Bottom pulsing dots */}
      <Animated.View style={[styles.dotsRow, taglineStyle]}>
        <PulsingDot delay={0} />
        <PulsingDot delay={200} />
        <PulsingDot delay={400} />
      </Animated.View>
    </View>
  );
};

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

const FloatingIcon: React.FC<{
  icon: string;
  index: number;
  progress: SharedValue<number>;
}> = ({ icon, index, progress }) => {
  const angle = (index * Math.PI * 2) / ICONS.length;

  const animatedStyle = useAnimatedStyle(() => {
    const distance = 150 * progress.value;
    const opacity = 0.18 * (1 - progress.value);
    return {
      opacity,
      transform: [
        { translateX: Math.cos(angle) * distance },
        { translateY: Math.sin(angle) * distance },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.floatingIcon,
        {
          left: SCREEN_W / 2 - 20,
          top: SCREEN_H / 2 - 20,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Text style={styles.iconEmoji}>{icon}</Text>
    </Animated.View>
  );
};

const PulsingDot: React.FC<{ delay: number }> = ({ delay }) => {
  const opacity = useSharedValue(0.5);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.5, { duration: 600 }),
        ),
        -1,
        false,
      ),
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
};

// ────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 100,
    height: 100,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWhite: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -1.5,
    textShadowColor: 'rgba(43, 179, 42, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  brandPrimary: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1.5,
    textShadowColor: 'rgba(43, 179, 42, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 25,
  },
  cursor: {
    width: 3,
    height: 52,
    marginLeft: 2,
    backgroundColor: colors.primary,
  },
  taglineWrap: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(43, 179, 42, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(43, 179, 42, 0.3)',
  },
  tagline: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  floatingIcon: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 32,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginHorizontal: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
});
