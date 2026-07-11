import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, Plus, Bell, MapPin } from 'lucide-react-native';
import type { MainStackParamList } from '@/types/navigation.types';
import {
  BecomeSellerBanner,
  type BecomeSellerBannerState,
  CategoryCard,
  ListingCard,
  TrendingHeader,
} from '@/components/marketplace';
import { Shimmer, ShimmerCard } from '@/components/common/Shimmer';
import { useAppSelector } from '@/hooks/useAppSelector';
import { resolvePostAdDestination } from '@/navigation/postAdRouter';
import { useGetTopCategoriesQuery } from '@/api/categoriesApi';
import { useGetTrendingListingsQuery } from '@/api/productsApi';
import { useGetUnreadCountQuery } from '@/api/notificationApi';
import { skipToken } from '@reduxjs/toolkit/query/react';
import type { CategoryNode, Listing } from '@/types';
import { formatRelativeShort } from '@/data/listingsStub';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';

interface ListingCardData {
  id: string;
  image?: string;
  title: string;
  price: string;
  location: string;
  time: string;
  badge?: string;
}

const formatPricePaise = (paise: number): string =>
  `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

const toCardData = (listing: Listing): ListingCardData => ({
  id: listing._id,
  image: listing.photos[0],
  title: listing.title,
  price: formatPricePaise(listing.price),
  location: listing.address ?? '',
  time: formatRelativeShort(listing.createdAt),
  badge: listing.condition,
});

const EMPTY_CATEGORIES: CategoryNode[] = [];
const EMPTY_LISTINGS: Listing[] = [];

type Nav = NativeStackNavigationProp<MainStackParamList>;

const resolveSellerBannerState = (
  user: { aadhaarVerified?: boolean; isSellerApproved?: boolean } | null,
): BecomeSellerBannerState | null => {
  if (!user) return null;
  if (user.isSellerApproved) return null;
  if (user.aadhaarVerified) return 'resume';
  return 'default';
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const user = useAppSelector(state => state.auth.user);
  const location = useAppSelector(state => state.location);

  const sellerBannerState = resolveSellerBannerState(user);

  // No independent pollingInterval here — shares the same cache entry the
  // global notification-toast watcher (mounted in MainNavigator) already polls.
  const { data: unreadCountData } = useGetUnreadCountQuery();
  const unreadCount = unreadCountData?.count ?? 0;
  const unreadBadgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  const {
    data: topCategories = EMPTY_CATEGORIES,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useGetTopCategoriesQuery();

  console.log('[HomeScreen] top categories response:', topCategories);
  console.log('[HomeScreen] top categories error:', categoriesError);

  const hasLocation = location.latitude != null && location.longitude != null;
  const {
    data: trendingData,
    isLoading: isLoadingTrending,
    error: trendingError,
  } = useGetTrendingListingsQuery(
    hasLocation
      ? { lat: location.latitude as number, lng: location.longitude as number }
      : skipToken,
  );

  console.log(
    '[HomeScreen] trending query args:',
    hasLocation
      ? { lat: location.latitude, lng: location.longitude }
      : 'skipped (no location yet)',
  );
  console.log('[HomeScreen] trending response:', trendingData);
  console.log('[HomeScreen] trending error:', trendingError);

  const trending: ListingCardData[] = (
    trendingData?.listings ?? EMPTY_LISTINGS
  ).map(toCardData);

  const handleBecomeSellerPress = () => {
    navigation.navigate('BecomeSellerIntro');
  };

  const handleSearchPress = () => {
    // 'Search' is a sibling tab of Home, not a screen on the outer Stack —
    // navigate directly, don't go through .getParent().
    navigation.navigate('Search' as never);
  };

  const handlePostAd = () => {
    const destination = resolvePostAdDestination(user);
    navigation.navigate(destination as never);
  };

  const handleSeeAllCategories = () => {
    navigation.navigate('CategoryList');
  };

  const handleCategoryPress = (category: CategoryNode) => {
    navigation.navigate('CategoryBrowse', {
      category: { id: category.id, name: category.name },
    });
  };

  const handleListingPress = (id: string) => {
    navigation.navigate('ListingDetail', { listingId: id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              Hi {user?.name?.split(' ')[0] ?? 'there'} 👋
            </Text>
            <View style={styles.locationRow}>
              <MapPin size={layout.iconSize.sm} color={colors.textMuted} />
              <Text style={styles.locationText} numberOfLines={1}>
                {location.city
                  ? `${location.city}${
                      location.state ? `, ${location.state}` : ''
                    }`
                  : 'Location unavailable'}
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.bellBtn}
            hitSlop={spacing.sm}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
          >
            <Bell size={layout.iconSize.md} color={colors.textPrimary} />
            {unreadCount > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadBadgeLabel}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Welcome */}
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>Welcome{`\n`}Back!</Text>
          <Text style={styles.welcomeSub}>Discover amazing deals near you</Text>
        </View>

        {/* Search bar */}
        <Pressable onPress={handleSearchPress} style={styles.searchWrap}>
          <Search size={layout.iconSize.md} color={colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, cars, jobs, properties…"
            placeholderTextColor={colors.textMuted}
            editable={false}
            pointerEvents="none"
          />
          <View style={styles.filterPill}>
            <Text style={styles.filterText}>Filter</Text>
          </View>
        </Pressable>

        {/* Become a Seller banner (hidden when user is already an active seller) */}
        {sellerBannerState ? (
          <View style={styles.sellerBannerWrap}>
            <BecomeSellerBanner
              state={sellerBannerState}
              onPress={handleBecomeSellerPress}
            />
          </View>
        ) : null}

        {/* Post Ad CTA */}
        <Pressable
          onPress={handlePostAd}
          style={({ pressed }) => [
            styles.postAdBtn,
            pressed && styles.postAdBtnPressed,
          ]}
        >
          <View style={styles.postAdIcon}>
            <Plus size={layout.iconSize.md} color={colors.white} />
          </View>
          <Text style={styles.postAdText}>Post an Ad</Text>
        </Pressable>

        {/* Categories */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <Pressable
            onPress={handleSeeAllCategories}
            hitSlop={spacing.sm}
            testID="see-all-categories"
          >
            <Text style={styles.sectionAction}>See all →</Text>
          </Pressable>
        </View>
        <View style={styles.categoryGrid} testID="home-category-grid">
          {categoriesLoading ? (
            <>
              <Shimmer width={80} height={80} borderRadius={radius.lg} />
              <Shimmer width={80} height={80} borderRadius={radius.lg} />
              <Shimmer width={80} height={80} borderRadius={radius.lg} />
              <Shimmer width={80} height={80} borderRadius={radius.lg} />
            </>
          ) : (
            topCategories.map(cat => (
              <View
                key={cat.id}
                style={styles.categoryCell}
                testID={`category-card-${cat.id}`}
              >
                <CategoryCard
                  name={cat.name}
                  onPress={() => handleCategoryPress(cat)}
                />
              </View>
            ))
          )}
        </View>

        {/* Trending */}
        <View style={styles.trendingHeader}>
          <TrendingHeader onActionPress={() => {}} />
        </View>

        <View testID="home-trending-list">
          {isLoadingTrending ? (
            <>
              <ShimmerCard />
              <ShimmerCard />
              <Shimmer
                width="100%"
                height={layout.cardImage + spacing.xl}
                borderRadius={radius.lg}
              />
            </>
          ) : trending.length === 0 ? (
            <View style={styles.emptyTrending}>
              <Text style={styles.emptyTrendingText}>
                No trending listings yet — be the first to post!
              </Text>
            </View>
          ) : (
            trending.map(item => (
              <ListingCard
                key={item.id}
                image={item.image}
                title={item.title}
                price={item.price}
                location={item.location}
                time={item.time}
                badge={item.badge}
                onPress={() => handleListingPress(item.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const CATEGORY_COLUMNS = 3;
const CATEGORY_GAP = spacing.sm;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  locationText: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
  bellBtn: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -spacing.xs,
    right: -spacing.xs,
    minWidth: spacing.lg,
    height: spacing.lg,
    borderRadius: spacing.lg / 2,
    paddingHorizontal: spacing.xs / 2,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    ...typography.caption,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs,
    color: colors.white,
    fontWeight: '700',
  },
  welcome: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    fontSize: fontSize['5xl'],
    fontWeight: '800',
    color: colors.white,
    lineHeight: fontSize['5xl'] * 1.05,
    letterSpacing: -1.5,
  },
  welcomeSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    letterSpacing: 0.2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    height: layout.inputHeight,
    borderWidth: 0.8,
    borderColor: colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    padding: 0,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.primaryAlpha15,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
  },
  filterText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  sellerBannerWrap: {
    marginTop: spacing.lg,
  },
  postAdBtn: {
    marginTop: spacing.lg,
    height: layout.buttonHeight + spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: spacing.xs },
    shadowOpacity: 0.35,
    shadowRadius: spacing.base,
    elevation: 4,
  },
  postAdBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  postAdIcon: {
    width: layout.iconSize.lg,
    height: layout.iconSize.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.whiteAlpha04,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAdText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  sectionAction: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -CATEGORY_GAP / 2,
  },
  categoryCell: {
    width: `${100 / CATEGORY_COLUMNS}%`,
    paddingHorizontal: CATEGORY_GAP / 2,
    marginBottom: CATEGORY_GAP,
  },
  trendingHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  emptyTrending: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTrendingText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
