import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Clock } from 'lucide-react-native';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'SellerPending'>;

export const SellerPendingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Clock size={56} color={colors.primary} />
        </View>
        <Text style={styles.title}>Application submitted</Text>
        <Text style={styles.body}>
          Hamari team aapki seller application review kar rahi hai. Approve hote
          hi aap products list kar sakenge — hum aapko notify karenge.
        </Text>
      </View>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => navigation.popToTop()}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
          ]}
        >
          <Text style={styles.primaryBtnText}>Back to home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const ICON_CIRCLE = 120;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    backgroundColor: colors.primaryAlpha15,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: fontSize.base * 1.6,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  primaryBtn: {
    height: layout.buttonHeight,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    ...typography.button,
    color: colors.white,
  },
});
