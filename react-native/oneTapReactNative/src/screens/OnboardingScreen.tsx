import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common/Button';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { completeOnboarding } from '@/store/authSlice';
import { colors, spacing, typography } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface Slide {
  key: string;
  emoji: string;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    emoji: '🎉',
    title: 'Welcome to OneTap365',
    description: 'Buy, Sell, Invest — all in one place',
  },
  {
    key: 'services',
    emoji: '🔧',
    title: 'Discover services near you',
    description:
      'Plumbers, electricians, cleaners and more — at your fingertips',
  },
  {
    key: 'invest',
    emoji: '🏘️',
    title: 'Invest in properties',
    description: 'Earn returns from real estate bidding opportunities',
  },
  {
    key: 'sell',
    emoji: '💼',
    title: 'Sell your products',
    description: 'Reach thousands of buyers in your city',
  },
];

export const OnboardingScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    } else {
      dispatch(completeOnboarding());
    }
  };

  const handleSkip = () => {
    dispatch(completeOnboarding());
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip button */}
      <View style={styles.header}>
        {!isLast && (
          <Pressable
            onPress={handleSkip}
            hitSlop={12}
            style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={item => item.key}
        renderItem={({ item }) => <SlideItem slide={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <Button title={isLast ? 'Get Started' : 'Next'} onPress={handleNext} />
      </View>
    </SafeAreaView>
  );
};

const SlideItem: React.FC<{ slide: Slide }> = ({ slide }) => {
  return (
    <View style={styles.slide}>
      <View style={styles.emojiCircle}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
      </View>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.description}>{slide.description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    height: 48,
    alignItems: 'center',
  },
  skipBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  pressed: {
    opacity: 0.6,
  },
  skipText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  slide: {
    width: SCREEN_W,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emojiCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(43, 179, 42, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(43, 179, 42, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3xl'],
  },
  emoji: {
    fontSize: 80,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.base,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
