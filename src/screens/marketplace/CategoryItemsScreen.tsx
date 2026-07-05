import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { ChevronLeft, LayoutGrid, List as ListIcon } from 'lucide-react-native';
import { EmptyState, ListingCard } from '@/components/marketplace';
import { ShimmerCard } from '@/components/common/Shimmer';
import {
  STUB_LIVE_LISTINGS,
  toListingCardShape,
  type ListingCardShape,
} from '@/data/listingsStub';
import {
  colors,
  fontSize,
  layout,
  spacing,
  typography,
} from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'CategoryItems'>;
type Props = NativeStackScreenProps<MainStackParamList, 'CategoryItems'>;

type ViewMode = 'grid' | 'list';

const STUB_SUBS = [
  { id: 'all', name: 'All' },
  { id: 'sub1', name: 'Brand A' },
  { id: 'sub2', name: 'Brand B' },
  { id: 'sub3', name: 'Brand C' },
];

export const CategoryItemsScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const { category, subcategoryId } = route.params;

  const [activeSub, setActiveSub] = useState(subcategoryId ?? 'all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const isLoading = false;
  const items: ListingCardShape[] = STUB_LIVE_LISTINGS.map(toListingCardShape);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={navigation.goBack}
          hitSlop={spacing.md}
          style={styles.backBtn}
        >
          <ChevronLeft size={layout.iconSize.lg} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{category.name}</Text>
        <Pressable
          onPress={() => setViewMode(prev => (prev === 'grid' ? 'list' : 'grid'))}
          hitSlop={spacing.md}
          style={styles.viewToggle}
        >
          {viewMode === 'grid' ? (
            <ListIcon size={layout.iconSize.md} color={colors.textPrimary} />
          ) : (
            <LayoutGrid size={layout.iconSize.md} color={colors.textPrimary} />
          )}
        </Pressable>
      </View>

      {/* Subcategory tabs */}
      <View style={styles.tabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {STUB_SUBS.map(sub => {
            const isActive = activeSub === sub.id;
            return (
              <Pressable
                key={sub.id}
                onPress={() => setActiveSub(sub.id)}
                style={[styles.tab, isActive && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    isActive && styles.tabTextActive,
                  ]}
                >
                  {sub.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <>
            <ShimmerCard />
            <ShimmerCard />
          </>
        ) : items.length === 0 ? (
          <EmptyState
            title="No items found"
            message="Try a different subcategory or check back soon."
          />
        ) : (
          items.map(item => (
            <ListingCard
              key={item.id}
              image={item.image}
              title={item.title}
              price={item.price}
              location={item.location}
              time={item.time}
              badge={item.badge}
              badgeColor={item.badgeColor}
              onPress={() =>
                navigation.navigate('ListingDetail', { listingId: item.id })
              }
            />
          ))
        )}
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
    flex: 1,
    textAlign: 'center',
  },
  viewToggle: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsWrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabs: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  tab: {
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing['3xl'],
    flexGrow: 1,
  },
});
