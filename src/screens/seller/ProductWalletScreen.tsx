import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Inbox, Minus, Plus } from 'lucide-react-native';
import { ShimmerCard } from '@/components/common/Shimmer';
import { WalletReceiptSheet } from '@/components/wallet/WalletReceiptSheet';
import {
  useGetWalletQuery,
  useGetWalletTransactionsQuery,
} from '@/api/walletApi';
import { useGetMyListingsQuery } from '@/api/productsApi';
import { useAppSelector } from '@/hooks/useAppSelector';
import { resolvePostAdDestination } from '@/navigation/postAdRouter';
import { formatCurrency } from '@/utils/formatters';
import type { WalletTransaction } from '@/types';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ProductWallet'>;

const EMPTY_TRANSACTIONS: WalletTransaction[] = [];

// ---- Helpers ----------------------------------------------------------------

const formatShortDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

const KIND_LABEL: Record<WalletTransaction['kind'], string> = {
  topup: 'Wallet top-up',
  package_purchase: 'Package purchased',
  bid_spend: 'Bid placed',
  bid_refund: 'Bid refunded',
  manual: 'Manual adjustment',
};

// ---- Screen -----------------------------------------------------------------

export const ProductWalletScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const user = useAppSelector(state => state.auth.user);
  const [receiptTxId, setReceiptTxId] = React.useState<string | null>(null);

  const { data: walletData, isLoading: isLoadingWallet } = useGetWalletQuery();
  const { data: txData, isLoading: isLoadingTx } =
    useGetWalletTransactionsQuery({ limit: 20 });
  // Source of truth for "how many can I post right now" — same field
  // POST /marketplace/listings gates on and MyAdsScreen/ListAProductScreen
  // already show. wallet.postCredits is a separate lifetime-purchased
  // counter that's never decremented, so it's not "available" slots.
  const { data: myListingsData, isLoading: isLoadingSlots } =
    useGetMyListingsQuery();

  const availableSlots = myListingsData?.summary.slotsRemaining ?? 0;
  const totalPostCreditsPurchased = walletData?.wallet.postCredits ?? 0;
  // biddingBalance is stored in paise; formatCurrency expects rupees.
  const biddingBalance = (walletData?.wallet.biddingBalance ?? 0) / 100;
  const postSlotTransactions = (
    txData?.transactions ?? EMPTY_TRANSACTIONS
  ).filter(t => t.field === 'postCredits');

  const hasNoSlots = !isLoadingSlots && availableSlots === 0;
  const isLoading = isLoadingWallet || isLoadingTx || isLoadingSlots;

  // Having slots doesn't mean isSellerApproved — a package purchase never
  // grants identity:kyc_verified, so route through the same gate as every
  // other "Post" entry point instead of assuming ListProduct is reachable.
  const handlePostProduct = () => {
    navigation.navigate(resolvePostAdDestination(user) as never);
  };

  const handleBuyMore = () => {
    navigation.navigate('PackageSelection');
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
        <Text style={styles.headerTitle}>Product Wallet</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <>
            <ShimmerCard />
            <ShimmerCard />
          </>
        ) : hasNoSlots ? (
          <EmptyWalletView
            onBuyPress={handleBuyMore}
            biddingBalance={biddingBalance}
            totalPostCreditsPurchased={totalPostCreditsPurchased}
          />
        ) : (
          <>
            {/* Hero */}
            <View style={styles.heroCard}>
              <Text style={styles.heroAvail}>
                {availableSlots} {availableSlots === 1 ? 'slot' : 'slots'}{' '}
                available
              </Text>
              <Text style={styles.heroSub}>Post slots for new listings</Text>

              <View style={styles.heroStatsGroup}>
                <View style={styles.heroBalanceRow}>
                  <Text style={styles.heroBalanceLabel}>
                    Total slots purchased (lifetime)
                  </Text>
                  <Text style={styles.heroBalanceValue}>
                    {totalPostCreditsPurchased}
                  </Text>
                </View>
                <View
                  style={[styles.heroBalanceRow, styles.heroBalanceRowNoBorder]}
                >
                  <Text style={styles.heroBalanceLabel}>Bidding balance</Text>
                  <Text style={styles.heroBalanceValue}>
                    {formatCurrency(biddingBalance)}
                  </Text>
                </View>
              </View>

              <View style={styles.heroBtnRow}>
                <Pressable
                  onPress={handlePostProduct}
                  disabled={availableSlots === 0}
                  style={({ pressed }) => [
                    styles.heroPrimaryBtn,
                    availableSlots === 0 && styles.heroPrimaryBtnDisabled,
                    pressed && availableSlots > 0 && styles.heroBtnPressed,
                  ]}
                >
                  <Text style={styles.heroPrimaryText}>Post a product</Text>
                </Pressable>
                <Pressable
                  onPress={handleBuyMore}
                  style={({ pressed }) => [
                    styles.heroOutlineBtn,
                    pressed && styles.heroBtnPressed,
                  ]}
                >
                  <Text style={styles.heroOutlineText}>Buy more slots</Text>
                </Pressable>
              </View>
            </View>

            {/* Ledger */}
            <SectionLabel text="Activity" />
            {postSlotTransactions.length === 0 ? (
              <View style={styles.sectionGroup}>
                <Text style={styles.emptyLedgerText}>
                  No slot activity yet.
                </Text>
              </View>
            ) : (
              <View style={styles.sectionGroup}>
                {postSlotTransactions.map((entry, i) => (
                  <LedgerRow
                    key={entry._id}
                    entry={entry}
                    isLast={i === postSlotTransactions.length - 1}
                    onPress={() => setReceiptTxId(entry._id)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <WalletReceiptSheet
        visible={receiptTxId != null}
        transactionId={receiptTxId}
        onClose={() => setReceiptTxId(null)}
      />
    </SafeAreaView>
  );
};

// ---- Subcomponents ----------------------------------------------------------

const SectionLabel: React.FC<{ text: string }> = ({ text }) => (
  <Text style={styles.sectionLabel}>{text.toUpperCase()}</Text>
);

const LedgerRow: React.FC<{
  entry: WalletTransaction;
  isLast: boolean;
  onPress: () => void;
}> = ({ entry, isLast, onPress }) => {
  const isCredit = entry.type === 'credit';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ledgerRow,
        !isLast && styles.ledgerRowDivider,
        pressed && styles.ledgerRowPressed,
      ]}
    >
      <View
        style={[
          styles.ledgerIconWrap,
          isCredit ? styles.ledgerIconCredit : styles.ledgerIconDebit,
        ]}
      >
        {isCredit ? (
          <Plus size={layout.iconSize.sm} color={colors.success} />
        ) : (
          <Minus size={layout.iconSize.sm} color={colors.error} />
        )}
      </View>
      <View style={styles.ledgerText}>
        <Text
          style={[
            styles.ledgerAmount,
            { color: isCredit ? colors.success : colors.error },
          ]}
        >
          {isCredit ? '+' : '−'}
          {entry.amount} {entry.amount === 1 ? 'slot' : 'slots'}
        </Text>
        <Text style={styles.ledgerReason}>
          {entry.description || KIND_LABEL[entry.kind]}
        </Text>
      </View>
      <Text style={styles.ledgerDate}>{formatShortDate(entry.createdAt)}</Text>
    </Pressable>
  );
};

const EmptyWalletView: React.FC<{
  onBuyPress: () => void;
  biddingBalance: number;
  totalPostCreditsPurchased: number;
}> = ({ onBuyPress, biddingBalance, totalPostCreditsPurchased }) => (
  <View style={styles.emptyWrap}>
    <View style={styles.emptyIconCircle}>
      <Inbox size={layout.iconSize.xl} color={colors.textMuted} />
    </View>
    <Text style={styles.emptyTitle}>
      {totalPostCreditsPurchased > 0
        ? 'All your slots are in use'
        : 'No active slots yet'}
    </Text>
    <Text style={styles.emptyBody}>
      {totalPostCreditsPurchased > 0
        ? 'A sold listing keeps its slot used permanently. Delete an unsold listing, wait for one to expire, or buy more to free up space.'
        : 'Buy your first pack to start posting products on OneTap.'}
    </Text>

    <View style={styles.emptyBalanceRow}>
      <Text style={styles.heroBalanceLabel}>
        Total slots purchased (lifetime)
      </Text>
      <Text style={styles.heroBalanceValue}>{totalPostCreditsPurchased}</Text>
    </View>
    <View style={[styles.emptyBalanceRow, styles.emptyBalanceRowTight]}>
      <Text style={styles.heroBalanceLabel}>Bidding balance</Text>
      <Text style={styles.heroBalanceValue}>
        {formatCurrency(biddingBalance)}
      </Text>
    </View>

    <Pressable
      onPress={onBuyPress}
      style={({ pressed }) => [
        styles.emptyCta,
        pressed && styles.heroBtnPressed,
      ]}
    >
      <Text style={styles.emptyCtaText}>Pick a package</Text>
    </Pressable>
  </View>
);

// ---- Styles -----------------------------------------------------------------

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
    ...typography.h4,
    color: colors.textPrimary,
    flex: 1,
  },
  headerSpacer: {
    width: layout.closeButton,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },

  // Hero
  heroCard: {
    backgroundColor: colors.primaryAlpha15,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    alignItems: 'center',
  },
  heroAvail: {
    fontSize: fontSize['4xl'],
    fontWeight: '900',
    color: colors.primary,
  },
  heroSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  heroStatsGroup: {
    width: '100%',
  },
  heroBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.primaryAlpha30,
  },
  heroBalanceRowNoBorder: {
    marginTop: spacing.sm,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  heroBalanceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  heroBalanceValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  heroBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
  heroPrimaryBtn: {
    flex: 1,
    height: layout.buttonHeightMd,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPrimaryBtnDisabled: {
    backgroundColor: colors.primaryAlpha30,
  },
  heroPrimaryText: {
    ...typography.button,
    color: colors.white,
  },
  heroOutlineBtn: {
    flex: 1,
    height: layout.buttonHeightMd,
    borderRadius: radius.lg,
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOutlineText: {
    ...typography.button,
    color: colors.primary,
  },
  heroBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },

  // Section label
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },

  // Section group (card with rows inside)
  sectionGroup: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  emptyLedgerText: {
    ...typography.caption,
    color: colors.textMuted,
    padding: spacing.base,
    textAlign: 'center',
  },

  // Ledger row
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  ledgerRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ledgerRowPressed: {
    backgroundColor: colors.whiteAlpha04,
  },
  ledgerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerIconCredit: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  ledgerIconDebit: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  ledgerText: {
    flex: 1,
  },
  ledgerAmount: {
    ...typography.bodyBold,
  },
  ledgerReason: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing['2xs'],
  },
  ledgerDate: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: layout.emptyIconCircle,
    height: layout.emptyIconCircle,
    borderRadius: layout.emptyIconCircle / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: fontSize.base * 1.6,
  },
  emptyBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.xl,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.card,
  },
  emptyBalanceRowTight: {
    marginTop: spacing.sm,
  },
  emptyCta: {
    height: layout.buttonHeight,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  emptyCtaText: {
    ...typography.button,
    color: colors.white,
  },
});
