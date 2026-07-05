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
import { ChevronLeft, SlidersHorizontal } from 'lucide-react-native';
import {
  type AppliedFilters,
  EmptyState,
  ListingCard,
  MarketplaceFilterSheet,
} from '@/components/marketplace';
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
  radius,
  spacing,
  typography,
} from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'CategoryBrowse'>;
type Props = NativeStackScreenProps<MainStackParamList, 'CategoryBrowse'>;

interface SubcategoryStub {
  id: string;
  name: string;
}

const STUB_SUBCATEGORIES: SubcategoryStub[] = [
  { id: 'all', name: 'All' },
  { id: 'sub1', name: 'Smartphones' },
  { id: 'sub2', name: 'Tablets' },
  { id: 'sub3', name: 'Accessories' },
  { id: 'sub4', name: 'Wearables' },
];

export const CategoryBrowseScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const { category } = route.params;

  const [activeSub, setActiveSub] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({});

  const isLoading = false;
  const listings: ListingCardShape[] = STUB_LIVE_LISTINGS.map(toListingCardShape);

  const handleApplyFilters = (next: AppliedFilters) => {
    setAppliedFilters(next);
    // TODO: re-run the listings query with the new filters once feed API ships.
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
        <Text style={styles.headerTitle}>{category.name}</Text>
        <Pressable
          onPress={() => setFilterOpen(true)}
          hitSlop={spacing.md}
          style={styles.filterBtn}
        >
          <SlidersHorizontal
            size={layout.iconSize.md}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>

      {/* Subcategory chips */}
      <View style={styles.chipScrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {STUB_SUBCATEGORIES.map(sub => {
            const isActive = activeSub === sub.id;
            return (
              <Pressable
                key={sub.id}
                onPress={() => setActiveSub(sub.id)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive && styles.chipTextActive,
                  ]}
                >
                  {sub.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Listings */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <>
            <ShimmerCard />
            <ShimmerCard />
            <ShimmerCard />
          </>
        ) : listings.length === 0 ? (
          <EmptyState
            title="No listings yet"
            message={`Be the first to post in ${category.name}.`}
            actionLabel="Post an Ad"
            onActionPress={() => {}}
          />
        ) : (
          listings.map(item => (
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

      <MarketplaceFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        initialFilters={appliedFilters}
        onApply={handleApplyFilters}
      />
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
  filterBtn: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipScrollWrap: {
    paddingVertical: spacing.sm,
  },
  chipScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
});
