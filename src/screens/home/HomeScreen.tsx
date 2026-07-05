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
import { STUB_LIVE_LISTINGS, toListingCardShape } from '@/data/listingsStub';
import { resolvePostAdDestination } from '@/navigation/postAdRouter';
import {
  colors,
  fontSize,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme';

interface CategoryStub {
  id: string;
  name: string;
  iconName?: string;
}

interface ListingStub {
  id: string;
  image?: string;
  title: string;
  price: string;
  location: string;
  time: string;
  badge?: string;
  badgeColor?: string;
}

const STUB_CATEGORIES: CategoryStub[] = [
  { id: '1', name: 'Mobiles', iconName: 'phone_iphone' },
  { id: '2', name: 'Vehicles', iconName: 'directions_car' },
  { id: '3', name: 'Properties', iconName: 'home' },
  { id: '4', name: 'Jobs', iconName: 'work' },
  { id: '5', name: 'Furniture', iconName: 'chair' },
  { id: '6', name: 'Fashion', iconName: 'checkroom' },
  { id: '7', name: 'Electronics', iconName: 'computer' },
  { id: '8', name: 'Sports', iconName: 'sports_soccer' },
  { id: '9', name: 'Pets', iconName: 'pets' },
];

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

  const isLoadingTrending = false;
  const trending: ListingStub[] = STUB_LIVE_LISTINGS.map(toListingCardShape);

  const handleBecomeSellerPress = () => {
    navigation.navigate('BecomeSellerIntro');
  };

  const handleSearchPress = () => {
    navigation.getParent()?.navigate('Search' as never);
  };

  const handlePostAd = () => {
    const destination = resolvePostAdDestination(user);
    navigation.navigate(destination as never);
  };

  const handleSeeAllCategories = () => {
    navigation.navigate('CategoryList');
  };

  const handleCategoryPress = (category: CategoryStub) => {
    navigation.navigate('CategoryBrowse', {
      category: { id: category.id, name: category.name, iconName: category.iconName },
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
                  ? `${location.city}${location.state ? `, ${location.state}` : ''}`
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
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        {/* Welcome */}
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>Welcome{`\n`}Back!</Text>
          <Text style={styles.welcomeSub}>
            Discover amazing deals near you
          </Text>
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
          <Pressable onPress={handleSeeAllCategories} hitSlop={spacing.sm}>
            <Text style={styles.sectionAction}>See all →</Text>
          </Pressable>
        </View>
        <View style={styles.categoryGrid}>
          {STUB_CATEGORIES.map(cat => (
            <View key={cat.id} style={styles.categoryCell}>
              <CategoryCard
                name={cat.name}
                iconName={cat.iconName}
                onPress={() => handleCategoryPress(cat)}
              />
            </View>
          ))}
        </View>

        {/* Trending */}
        <View style={styles.trendingHeader}>
          <TrendingHeader onActionPress={() => {}} />
        </View>

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
              badgeColor={item.badgeColor}
              onPress={() => handleListingPress(item.id)}
            />
          ))
        )}
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
  bellDot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: spacing.sm / 2,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.background,
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
