import React, { useMemo } from 'react';
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
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';
import { EmptyState } from '@/components/marketplace';
import { formatINR } from '@/data/packagesCatalog';
import {
  formatRelativeShort,
  isOwnedByCurrentSeller,
  STUB_LISTINGS,
  type StubListing,
  stubThumbColour,
} from '@/data/listingsStub';
import { useToast } from '@/hooks/useToast';
import {
  colors,
  fontSize,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'SalesHistory'>;

const isCurrentMonth = (iso: string, now: Date = new Date()): boolean => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
};

const sortBySoldDesc = (a: StubListing, b: StubListing): number => {
  const aT = new Date(a.soldAtIso ?? '').getTime();
  const bT = new Date(b.soldAtIso ?? '').getTime();
  return bT - aT;
};

export const SellerSalesHistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();

  const sales = useMemo(
    () =>
      STUB_LISTINGS
        .filter(l => l.status === 'sold' && isOwnedByCurrentSeller(l))
        .sort(sortBySoldDesc),
    [],
  );

  const { thisMonth, earlier, totalRevenuePaise } = useMemo(() => {
    const now = new Date();
    const tm: StubListing[] = [];
    const eo: StubListing[] = [];
    let total = 0;
    for (const s of sales) {
      total += s.priceInPaise;
      if (s.soldAtIso && isCurrentMonth(s.soldAtIso, now)) {
        tm.push(s);
      } else {
        eo.push(s);
      }
    }
    return { thisMonth: tm, earlier: eo, totalRevenuePaise: total };
  }, [sales]);

  const isEmpty = sales.length === 0;

  const handleOpenListing = (sale: StubListing) => {
    navigation.navigate('ListingDetail', { listingId: sale.id });
  };

  const handleViewReceipt = (_sale: StubListing) => {
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
        {isEmpty ? (
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
                    key={sale.id}
                    sale={sale}
                    onPress={() => handleOpenListing(sale)}
                    onViewReceipt={() => handleViewReceipt(sale)}
                  />
                ))}
              </Section>
            ) : null}

            {earlier.length > 0 ? (
              <Section
                title={thisMonth.length > 0 ? 'Earlier' : 'All sales'}
              >
                {earlier.map(sale => (
                  <SaleCard
                    key={sale.id}
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
  sale: StubListing;
  onPress: () => void;
  onViewReceipt: () => void;
}

const SaleCard: React.FC<SaleCardProps> = ({ sale, onPress, onViewReceipt }) => {
  const soldRelative = sale.soldAtIso
    ? formatRelativeShort(sale.soldAtIso)
    : '';
  const buyer = sale.soldToName ?? 'a buyer';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.thumb,
            { backgroundColor: stubThumbColour(sale.id) },
          ]}
        />
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {sale.title}
          </Text>
          {/* Price stays in primary green — earnings matter, not dimmed */}
          <Text style={styles.cardPrice}>{formatINR(sale.priceInPaise)}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.statusRow}>
          <CheckCircle2
            size={layout.iconSize.sm}
            color={colors.success}
          />
          <Text style={styles.statusText}>
            Sold to {buyer}
            {soldRelative ? ` · ${soldRelative}` : ''}
          </Text>
        </View>
        <Pressable
          onPress={onViewReceipt}
          hitSlop={spacing.sm}
          style={styles.receiptLink}
        >
          <Text style={styles.receiptLinkText}>View receipt</Text>
          <ChevronRight
            size={layout.iconSize.sm}
            color={colors.primary}
          />
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
