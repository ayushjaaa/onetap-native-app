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
  Clock,
  ShoppingBag,
  XCircle,
} from 'lucide-react-native';
import { EmptyState } from '@/components/marketplace';
import { formatINR } from '@/data/packagesCatalog';
import {
  olderPurchases,
  type PurchaseRecord,
  type PurchaseStatus,
  recentPurchases,
  STUB_PURCHASES,
} from '@/data/purchaseStub';
import {
  formatRelativeShort,
  stubThumbColour,
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

type Nav = NativeStackNavigationProp<MainStackParamList, 'PurchaseHistory'>;

export const BuyerPurchaseHistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const purchases = STUB_PURCHASES;
  const recent = useMemo(() => recentPurchases(purchases), [purchases]);
  const older = useMemo(() => olderPurchases(purchases), [purchases]);

  const isEmpty = purchases.length === 0;

  const handleOpenListing = (p: PurchaseRecord) => {
    navigation.navigate('ListingDetail', { listingId: p.listingId });
  };

  const handleBrowse = () => {
    navigation.popToTop();
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
        {isEmpty ? (
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
                {recent.map(p => (
                  <PurchaseCard
                    key={p.id}
                    purchase={p}
                    onPress={() => handleOpenListing(p)}
                  />
                ))}
              </Section>
            ) : null}

            {older.length > 0 ? (
              <Section
                title={recent.length > 0 ? 'All purchases' : 'Purchases'}
              >
                {older.map(p => (
                  <PurchaseCard
                    key={p.id}
                    purchase={p}
                    onPress={() => handleOpenListing(p)}
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
  purchase: PurchaseRecord;
  onPress: () => void;
}

const PurchaseCard: React.FC<PurchaseCardProps> = ({ purchase, onPress }) => {
  const isDim =
    purchase.status === 'lost' || purchase.status === 'won';
  // Visual fade only for resolved outcomes that aren't actionable from this
  // screen anymore. Pending stays bright since the buyer is still waiting.

  const statusLabel = STATUS_COPY[purchase.status];
  const StatusIcon = STATUS_ICON[purchase.status];
  const statusColour = STATUS_COLOUR[purchase.status];

  const timestampLabel = purchase.resolvedAtIso
    ? formatRelativeShort(purchase.resolvedAtIso)
    : formatRelativeShort(purchase.interestedAtIso);

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
            { backgroundColor: stubThumbColour(purchase.listingId) },
            isDim && styles.thumbDim,
          ]}
        />
        <View style={styles.cardText}>
          <Text
            style={[styles.cardTitle, isDim && styles.cardTitleDim]}
            numberOfLines={2}
          >
            {purchase.listingTitle}
          </Text>
          <Text style={[styles.cardPrice, isDim && styles.cardPriceDim]}>
            {formatINR(purchase.priceInPaise)}
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
        {purchase.status === 'won' ? (
          <Text style={styles.sellerLine}>
            Pay {purchase.sellerName} on delivery
          </Text>
        ) : (
          <Text style={styles.sellerLine}>Seller: {purchase.sellerName}</Text>
        )}
      </View>
    </Pressable>
  );
};

const STATUS_COPY: Record<PurchaseStatus, string> = {
  won: 'Got the deal',
  lost: 'Seller chose someone else',
  pending: 'Awaiting seller decision',
};

const STATUS_ICON: Record<PurchaseStatus, typeof CheckCircle2> = {
  won: CheckCircle2,
  lost: XCircle,
  pending: Clock,
};

const STATUS_COLOUR: Record<PurchaseStatus, string> = {
  won: colors.success,
  lost: colors.textMuted,
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
  sellerLine: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
