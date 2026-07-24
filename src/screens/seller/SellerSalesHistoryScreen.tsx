import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';
import { EmptyState } from '@/components/marketplace';
import { ShimmerCard } from '@/components/common/Shimmer';
import { formatINR } from '@/data/packagesCatalog';
import { formatRelativeShort, stubThumbColour } from '@/data/listingsStub';
import { useGetMyTransactionsQuery } from '@/api/transactionsApi';
import { useGetListingByIdQuery } from '@/api/productsApi';
import { buildMediaUrl } from '@/utils/media';
import { useToast } from '@/hooks/useToast';
import type { Transaction } from '@/types';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'SalesHistory'>;

const EMPTY_TRANSACTIONS: Transaction[] = [];

const isCurrentMonth = (iso: string, now: Date = new Date()): boolean => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
};

export const SellerSalesHistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();

  const { data, isLoading } = useGetMyTransactionsQuery({ role: 'seller' });
  const sales = data?.transactions ?? EMPTY_TRANSACTIONS;

  const { thisMonth, earlier, totalRevenuePaise } = useMemo(() => {
    const now = new Date();
    const tm: Transaction[] = [];
    const eo: Transaction[] = [];
    let total = 0;
    for (const s of sales) {
      total += s.amount;
      if (isCurrentMonth(s.completedAt, now)) {
        tm.push(s);
      } else {
        eo.push(s);
      }
    }
    return { thisMonth: tm, earlier: eo, totalRevenuePaise: total };
  }, [sales]);

  const isEmpty = !isLoading && sales.length === 0;

  const handleOpenListing = (sale: Transaction) => {
    navigation.navigate('ListingDetail', { listingId: sale.listingId });
  };

  const handleViewReceipt = (_sale: Transaction) => {
    // TODO: receipt detail screen / sheet in v1.5 — for now surface the key
    // line so the seller can see something happened.
    toast.info({
      title: 'Receipt coming in v1.5',
      message: 'Per-sale receipt detail screen will land then.',
    });
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
        <Text style={styles.headerTitle}>My Sales</Text>
        {totalRevenuePaise > 0 ? (
          <View style={styles.revenueChip}>
            <TrendingUp size={layout.iconSize.sm} color={colors.success} />
            <Text style={styles.revenueChipText}>
              {formatINR(totalRevenuePaise)}
            </Text>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
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
            icon={TrendingUp}
            title="No sales yet"
            message="Keep your listings active — sales yahaan track honge."
          />
        ) : (
          <>
            {thisMonth.length > 0 ? (
              <Section
                title={`This month (${thisMonth.length} ${
                  thisMonth.length === 1 ? 'sale' : 'sales'
                })`}
              >
                {thisMonth.map(sale => (
                  <SaleCard
                    key={sale._id}
                    sale={sale}
                    onPress={() => handleOpenListing(sale)}
                    onViewReceipt={() => handleViewReceipt(sale)}
                  />
                ))}
              </Section>
            ) : null}

            {earlier.length > 0 ? (
              <Section title={thisMonth.length > 0 ? 'Earlier' : 'All sales'}>
                {earlier.map(sale => (
                  <SaleCard
                    key={sale._id}
                    sale={sale}
                    onPress={() => handleOpenListing(sale)}
                    onViewReceipt={() => handleViewReceipt(sale)}
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

interface SaleCardProps {
  sale: Transaction;
  onPress: () => void;
  onViewReceipt: () => void;
}

const SaleCard: React.FC<SaleCardProps> = ({
  sale,
  onPress,
  onViewReceipt,
}) => {
  // Transaction docs only store listingId/amount — title comes from a
  // client-side join against the listing itself. Sold listings are always
  // publicly readable (GET /listings/:id allows Live|Sold), so this never
  // 404s for a real sale.
  const { data: listing } = useGetListingByIdQuery(sale.listingId);
  const [imageFailed, setImageFailed] = useState(false);

  const soldRelative = formatRelativeShort(sale.completedAt);
  const title = listing?.title ?? 'Listing';
  const imageUrl = listing?.photos?.[0]
    ? buildMediaUrl(listing.photos[0])
    : undefined;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardTopRow}>
        {imageUrl && !imageFailed ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.thumb}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View
            style={[
              styles.thumb,
              { backgroundColor: stubThumbColour(sale.listingId) },
            ]}
          />
        )}
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>
          {/* Price stays in primary green — earnings matter, not dimmed */}
          <Text style={styles.cardPrice}>{formatINR(sale.amount)}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.statusRow}>
          <CheckCircle2 size={layout.iconSize.sm} color={colors.success} />
          <Text style={styles.statusText}>Sold · {soldRelative}</Text>
        </View>
        <Pressable
          onPress={onViewReceipt}
          hitSlop={spacing.sm}
          style={styles.receiptLink}
        >
          <Text style={styles.receiptLinkText}>View receipt</Text>
          <ChevronRight size={layout.iconSize.sm} color={colors.primary} />
        </Pressable>
      </View>
    </Pressable>
  );
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
  revenueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  revenueChipText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.success,
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
  cardText: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  cardPrice: {
    ...typography.h4,
    color: colors.primary,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statusRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    fontWeight: '600',
  },
  receiptLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2xs'],
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  receiptLinkText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
});
