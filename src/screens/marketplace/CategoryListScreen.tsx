import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { CategoryCard } from '@/components/marketplace';
import { Shimmer } from '@/components/common/Shimmer';
import { useGetCategoryTreeQuery } from '@/api/categoriesApi';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';
import type { CategoryNode } from '@/types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'CategoryList'>;

const EMPTY_CATEGORIES: CategoryNode[] = [];

export const CategoryListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { data: categories = EMPTY_CATEGORIES, isLoading } =
    useGetCategoryTreeQuery();

  const handleSelect = (category: CategoryNode) => {
    navigation.navigate('CategoryBrowse', {
      category: { id: category.id, name: category.name },
    });
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top']}
      testID="category-list-screen"
    >
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
            categories.map(cat => (
              <Pressable
                key={cat.id}
                testID={`category-row-${cat.id}`}
                onPress={() => handleSelect(cat)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.rowIconWrap}>
                  <CategoryCard
                    name={cat.name}
                    showLabel={false}
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
