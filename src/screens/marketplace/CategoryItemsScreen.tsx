import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { ChevronLeft, LayoutGrid, List as ListIcon } from 'lucide-react-native';
import { EmptyState, ListingCard } from '@/components/marketplace';
import { ShimmerCard, Shimmer } from '@/components/common/Shimmer';
import { formatRelativeShort } from '@/data/listingsStub';
import { useGetCategoryTreeQuery } from '@/api/categoriesApi';
import { useGetFeedQuery } from '@/api/productsApi';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { useAppSelector } from '@/hooks/useAppSelector';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';
import type { CategoryNode, Listing } from '@/types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'CategoryItems'>;
type Props = NativeStackScreenProps<MainStackParamList, 'CategoryItems'>;

type ViewMode = 'grid' | 'list';

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

export const CategoryItemsScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const { category, subcategoryId } = route.params;

  const [activeSub, setActiveSub] = useState(subcategoryId ?? 'all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const location = useAppSelector(state => state.location);
  const hasLocation = location.latitude != null && location.longitude != null;

  const { data: tree, isLoading: categoriesLoading } =
    useGetCategoryTreeQuery();
  const subcategories = [
    ALL_SUBCATEGORY,
    ...(tree?.find(node => node.id === category.id)?.children ??
      EMPTY_SUBCATEGORIES),
  ];

  // Same backend constraint as CategoryBrowseScreen: the feed's `category`
  // filter is a plain string-equality match against `Listing.category`
  // (leaf ids only, e.g. `vehicles-cars`) — it can't match "any child of X".
  // "All" therefore omits the server-side filter and scopes client-side by
  // prefix below, instead of sending this screen's top-level category.id
  // (which no real listing is ever stored with).
  const selectedLeafId = activeSub !== 'all' ? activeSub : undefined;

  const { data: feedData, isLoading: isLoadingItems } = useGetFeedQuery(
    hasLocation
      ? {
          lat: location.latitude as number,
          lng: location.longitude as number,
          category: selectedLeafId,
        }
      : skipToken,
  );

  const isLoading = isLoadingItems;
  const rawItems = feedData?.listings ?? EMPTY_LISTINGS;
  const scopedItems = selectedLeafId
    ? rawItems
    : rawItems.filter(
        l =>
          l.category.startsWith(`${category.id}-`) ||
          l.category === category.id,
      );
  const items = scopedItems.map(toCardData);

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top']}
      testID="category-items-screen"
    >
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
          onPress={() =>
            setViewMode(prev => (prev === 'grid' ? 'list' : 'grid'))
          }
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
        {categoriesLoading ? (
          <View style={styles.tabs}>
            <Shimmer width={60} height={24} borderRadius={radius.full} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            {subcategories.map(sub => {
              const isActive = activeSub === sub.id;
              return (
                <Pressable
                  key={sub.id}
                  testID={`subcategory-tab-${sub.id}`}
                  onPress={() => setActiveSub(sub.id)}
                  style={[styles.tab, isActive && styles.tabActive]}
                >
                  <Text
                    style={[styles.tabText, isActive && styles.tabTextActive]}
                  >
                    {sub.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
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
