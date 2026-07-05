import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { CategoryCard } from '@/components/marketplace';
import { Shimmer } from '@/components/common/Shimmer';
import {
  colors,
  fontSize,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme';
import type {
  CategoryRef,
  MainStackParamList,
} from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'CategoryList'>;

const STUB_CATEGORIES: CategoryRef[] = [
  { id: '1', name: 'Mobiles', iconName: 'phone_iphone' },
  { id: '2', name: 'Vehicles', iconName: 'directions_car' },
  { id: '3', name: 'Properties', iconName: 'home' },
  { id: '4', name: 'Jobs', iconName: 'work' },
  { id: '5', name: 'Furniture', iconName: 'chair' },
  { id: '6', name: 'Fashion', iconName: 'checkroom' },
  { id: '7', name: 'Electronics', iconName: 'computer' },
  { id: '8', name: 'Sports', iconName: 'sports_soccer' },
  { id: '9', name: 'Pets', iconName: 'pets' },
  { id: '10', name: 'Books', iconName: 'book' },
  { id: '11', name: 'Services', iconName: 'handyman' },
];

export const CategoryListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const isLoading = false;

  const handleSelect = (category: CategoryRef) => {
    navigation.navigate('CategoryBrowse', { category });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={navigation.goBack}
          hitSlop={spacing.md}
          style={styles.backBtn}
        >
          <ChevronLeft size={layout.iconSize.lg} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>All Categories</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode toggle: Grid vs List view — list view here */}
        <View style={styles.section}>
          {isLoading ? (
            <>
              <Shimmer
                width="100%"
                height={layout.buttonHeight}
                borderRadius={radius.lg}
                style={styles.shimmerRow}
              />
              <Shimmer
                width="100%"
                height={layout.buttonHeight}
                borderRadius={radius.lg}
                style={styles.shimmerRow}
              />
              <Shimmer
                width="100%"
                height={layout.buttonHeight}
                borderRadius={radius.lg}
                style={styles.shimmerRow}
              />
            </>
          ) : (
            STUB_CATEGORIES.map(cat => (
              <Pressable
                key={cat.id}
                onPress={() => handleSelect(cat)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.rowIconWrap}>
                  <CategoryCard
                    name=""
                    iconName={cat.iconName}
                    style={styles.rowIconCard}
                  />
                </View>
                <Text style={styles.rowName}>{cat.name}</Text>
                <ChevronRight
                  size={layout.iconSize.md}
                  color={colors.textMuted}
                />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: layout.closeButton,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  section: {
    gap: spacing.sm,
  },
  shimmerRow: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.base,
  },
  rowPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  rowIconWrap: {
    width: layout.iconSize.xl + spacing.md,
    height: layout.iconSize.xl + spacing.md,
  },
  rowIconCard: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.surface,
  },
  rowName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
});
