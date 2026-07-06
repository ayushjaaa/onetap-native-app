import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { ShimmerCard, Shimmer } from '@/components/common/Shimmer';
import { useGetCategoryTreeQuery } from '@/api/categoriesApi';
import { useGetFeedQuery } from '@/api/productsApi';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { formatRelativeShort } from '@/data/listingsStub';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';
import type { CategoryNode, Listing } from '@/types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'CategoryBrowse'>;
type Props = NativeStackScreenProps<MainStackParamList, 'CategoryBrowse'>;

const ALL_SUBCATEGORY: CategoryNode = { id: 'all', name: 'All' };
const EMPTY_SUBCATEGORIES: CategoryNode[] = [];
const EMPTY_LISTINGS: Listing[] = [];

const formatPricePaise = (paise: number): string =>
  `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

const toCardData = (listing: Listing) => ({
  id: listing._id,
  image: listing.photos[0],
  title: listing.title,
  price: formatPricePaise(listing.price),
  location: listing.address ?? '',
  time: formatRelativeShort(listing.createdAt),
  badge: listing.condition,
});

export const CategoryBrowseScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const { category } = route.params;

  const [activeSub, setActiveSub] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({});

  const location = useAppSelector(state => state.location);
  const hasLocation = location.latitude != null && location.longitude != null;

  const { data: tree, isLoading: categoriesLoading } =
    useGetCategoryTreeQuery();
  const subcategories = [
    ALL_SUBCATEGORY,
    ...(tree?.find(node => node.id === category.id)?.children ??
      EMPTY_SUBCATEGORIES),
  ];

  // Chip picker and filter-sheet category picker are mutually exclusive —
  // picking a chip clears any filter-sheet categoryId (see handleSelectSub)
  // and applying the filter sheet resets the chip to "all" (see
  // handleApplyFilters), so exactly one of the two is ever meaningful.
  // A leaf id (e.g. `vehicles-cars`) is sent straight to the backend, which
  // does a plain string-equality match against `Listing.category` — it has
  // no "any child of X" support. "All" (no leaf picked) therefore can't be
  // passed as this screen's top-level `category.id` (e.g. `vehicles`):
  // listings are never stored with that id, only with leaf ids, so the
  // server would return zero results. Instead "All" omits the server-side
  // category filter entirely and filters client-side by prefix below.
  const selectedLeafId =
    appliedFilters.categoryId ?? (activeSub !== 'all' ? activeSub : undefined);

  const { data: feedData, isLoading: isLoadingListings } = useGetFeedQuery(
    hasLocation
      ? {
          lat: location.latitude as number,
          lng: location.longitude as number,
          category: selectedLeafId,
          // AppliedFilters' minPrice/maxPrice are rupees (see its own doc
          // comment); the backend's feed endpoint expects paise — convert here.
          minPrice:
            appliedFilters.minPrice !== undefined
              ? appliedFilters.minPrice * 100
              : undefined,
          maxPrice:
            appliedFilters.maxPrice !== undefined
              ? appliedFilters.maxPrice * 100
              : undefined,
        }
      : skipToken,
  );

  const isLoading = isLoadingListings;
  const rawListings = feedData?.listings ?? EMPTY_LISTINGS;
  // When no specific leaf is selected, the feed above was fetched with no
  // category filter — narrow it client-side to this top-level category's
  // own subtree so "All" still means "all of Vehicles," not "everything."
  const scopedListings = selectedLeafId
    ? rawListings
    : rawListings.filter(
        l =>
          l.category.startsWith(`${category.id}-`) ||
          l.category === category.id,
      );
  const listings = scopedListings.map(toCardData);

  const handleApplyFilters = (next: AppliedFilters) => {
    setAppliedFilters(next);
    setActiveSub('all');
  };

  const handleSelectSub = (subId: string) => {
    setActiveSub(subId);
    setAppliedFilters(prev => ({ ...prev, categoryId: undefined }));
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top']}
      testID="category-browse-screen"
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
        {categoriesLoading ? (
          <View style={styles.chipScroll}>
            <Shimmer width={60} height={32} borderRadius={radius.full} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {subcategories.map(sub => {
              const isActive = activeSub === sub.id;
              return (
                <Pressable
                  key={sub.id}
                  testID={`subcategory-chip-${sub.id}`}
                  onPress={() => handleSelectSub(sub.id)}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, isActive && styles.chipTextActive]}
                  >
                    {sub.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
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
        categoryTree={tree}
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
