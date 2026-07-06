import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  ShoppingBag,
  XCircle,
} from 'lucide-react-native';
import { EmptyState } from '@/components/marketplace';
import { ShimmerCard } from '@/components/common/Shimmer';
import { formatINR } from '@/data/packagesCatalog';
import { formatRelativeShort, stubThumbColour } from '@/data/listingsStub';
import { useGetMyInterestsAsBuyerQuery } from '@/api/transactionsApi';
import { useGetListingByIdQuery } from '@/api/productsApi';
import type { Interest, InterestStatus } from '@/types';
import { colors, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'PurchaseHistory'>;

const EMPTY_INTERESTS: Interest[] = [];

const isRecent = (iso: string, now: Date = new Date()): boolean => {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return false;
  return now.getTime() - d <= 24 * 60 * 60 * 1000;
};

export const BuyerPurchaseHistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const { data, isLoading } = useGetMyInterestsAsBuyerQuery({ limit: 50 });
  const interests = data?.interests ?? EMPTY_INTERESTS;

  const { recent, older } = useMemo(() => {
    const now = new Date();
    const r: Interest[] = [];
    const o: Interest[] = [];
    for (const i of interests) {
      if (isRecent(i.createdAt, now)) r.push(i);
      else o.push(i);
    }
    return { recent: r, older: o };
  }, [interests]);

  const isEmpty = !isLoading && interests.length === 0;

  const handleOpenListing = (i: Interest) => {
    navigation.navigate('ListingDetail', { listingId: i.listingId });
  };

  const handleBrowse = () => {
    // popToTop() alone would land back on whichever tab was last active
    // (this screen is reached from the Profile tab), not necessarily Home —
    // navigating to Tabs with an explicit nested Home screen param resolves
    // both the stack pop and the tab switch in one call.
    navigation.navigate('Tabs', { screen: 'Home' });
  };

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
        <Text style={styles.headerTitle}>My Purchases</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isEmpty && styles.scrollContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <>
            <ShimmerCard />
            <ShimmerCard />
          </>
        ) : isEmpty ? (
          <EmptyState
            icon={ShoppingBag}
            title="No purchases yet"
            message="Listings jinpe aap Buy karoge, yahaan track honge."
            actionLabel="Start browsing"
            onActionPress={handleBrowse}
          />
        ) : (
          <>
            {recent.length > 0 ? (
              <Section title="Recent (last 24h)">
                {recent.map(i => (
                  <PurchaseCard
                    key={i._id}
                    interest={i}
                    onPress={() => handleOpenListing(i)}
                  />
                ))}
              </Section>
            ) : null}

            {older.length > 0 ? (
              <Section
                title={recent.length > 0 ? 'All purchases' : 'Purchases'}
              >
                {older.map(i => (
                  <PurchaseCard
                    key={i._id}
                    interest={i}
                    onPress={() => handleOpenListing(i)}
                  />
                ))}
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ---- Subcomponents ----------------------------------------------------------

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
    <View style={styles.sectionGroup}>{children}</View>
  </View>
);

interface PurchaseCardProps {
  interest: Interest;
  onPress: () => void;
}

const PurchaseCard: React.FC<PurchaseCardProps> = ({ interest, onPress }) => {
  // Interest docs only store listingId/buyerId/sellerId — title/price come
  // from a client-side join. A completed (won) purchase's listing is always
  // Sold, and a pending one is always Live, so GET /listings/:id (which only
  // serves Live|Sold) never 404s here — but a rejected interest's listing
  // could since then have moved to Rejected/Expired/Deleted by the seller,
  // so `listing` may be undefined for the 'lost' case and falls back below.
  const { data: listing } = useGetListingByIdQuery(interest.listingId);

  const isDim =
    interest.status === 'rejected' || interest.status === 'completed';

  const statusLabel = STATUS_COPY[interest.status];
  const StatusIcon = STATUS_ICON[interest.status];
  const statusColour = STATUS_COLOUR[interest.status];

  const timestampLabel = formatRelativeShort(interest.createdAt);
  const title = listing?.title ?? 'Listing';
  const priceInPaise = listing?.price;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.thumb,
            { backgroundColor: stubThumbColour(interest.listingId) },
            isDim && styles.thumbDim,
          ]}
        />
        <View style={styles.cardText}>
          <Text
            style={[styles.cardTitle, isDim && styles.cardTitleDim]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text style={[styles.cardPrice, isDim && styles.cardPriceDim]}>
            {priceInPaise != null ? formatINR(priceInPaise) : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.statusRow}>
          <StatusIcon size={layout.iconSize.sm} color={statusColour} />
          <Text style={[styles.statusText, { color: statusColour }]}>
            {statusLabel}
          </Text>
          <Text style={styles.statusTime}>· {timestampLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const STATUS_COPY: Record<InterestStatus, string> = {
  completed: 'Got the deal',
  rejected: 'Seller chose someone else',
  pending: 'Awaiting seller decision',
};

const STATUS_ICON: Record<InterestStatus, typeof CheckCircle2> = {
  completed: CheckCircle2,
  rejected: XCircle,
  pending: Clock,
};

const STATUS_COLOUR: Record<InterestStatus, string> = {
  completed: colors.success,
  rejected: colors.textMuted,
  pending: colors.warning,
};

// ---- Styles -----------------------------------------------------------------

const THUMB = 88;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
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
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  headerSpacer: {
    width: layout.closeButton,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  scrollContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  sectionGroup: {
    gap: spacing.md,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.base,
    gap: spacing.md,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.997 }],
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
  },
  thumbDim: {
    opacity: 0.55,
  },
  cardText: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  cardTitleDim: {
    color: colors.textSecondary,
  },
  cardPrice: {
    ...typography.h4,
    color: colors.primary,
  },
  cardPriceDim: {
    color: colors.textSecondary,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
  },
  statusTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
