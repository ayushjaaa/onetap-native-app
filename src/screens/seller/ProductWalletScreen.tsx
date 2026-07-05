import React from 'react';
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
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Minus,
  Package as PackageIcon,
  Plus,
} from 'lucide-react-native';
import { formatINR } from '@/data/packagesCatalog';
import {
  colors,
  fontSize,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ProductWallet'>;

// ---- Stub data (replace with GET /me/wallet + /me/wallet/ledger) ------------

interface ActivePackage {
  id: string;
  name: string;
  postSlots: number;
  validTillIso: string;
  purchasedAtIso: string;
  pricePaidInPaise: number;
}

interface LedgerEntry {
  id: string;
  kind: 'credit' | 'debit';
  slots: number;
  reason: string;
  atIso: string;
}

const STUB_ACTIVE: ActivePackage[] = [
  {
    id: 'pkg_001',
    name: 'Pro Pack',
    postSlots: 5,
    validTillIso: '2026-08-12',
    purchasedAtIso: '2026-05-14',
    pricePaidInPaise: 19900,
  },
  {
    id: 'pkg_002',
    name: 'Starter',
    postSlots: 1,
    validTillIso: '2026-05-22',
    purchasedAtIso: '2026-02-22',
    pricePaidInPaise: 4900,
  },
];

const STUB_LEDGER: LedgerEntry[] = [
  {
    id: 'l1',
    kind: 'credit',
    slots: 5,
    reason: 'Pro Pack purchased',
    atIso: '2026-05-14',
  },
  {
    id: 'l2',
    kind: 'debit',
    slots: 1,
    reason: 'Posted iPhone 13',
    atIso: '2026-05-14',
  },
  {
    id: 'l3',
    kind: 'credit',
    slots: 1,
    reason: 'Listing rejected — slot refunded',
    atIso: '2026-05-15',
  },
  {
    id: 'l4',
    kind: 'debit',
    slots: 1,
    reason: 'Posted Honda Activa',
    atIso: '2026-05-16',
  },
];

// Stub aggregates that would normally come from server.
const STUB_USED_SLOTS = 2;

// ---- Helpers ----------------------------------------------------------------

const formatShortDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

const daysUntil = (iso: string): number => {
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

// ---- Screen -----------------------------------------------------------------

export const ProductWalletScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const activePackages = STUB_ACTIVE;
  const ledger = STUB_LEDGER;
  const usedSlots = STUB_USED_SLOTS;

  const totalSlots = activePackages.reduce((sum, p) => sum + p.postSlots, 0);
  const availableSlots = Math.max(0, totalSlots - usedSlots);
  const usagePct = totalSlots > 0 ? Math.min(1, usedSlots / totalSlots) : 0;

  const hasNoPackages = activePackages.length === 0;
  const allExpired =
    !hasNoPackages && activePackages.every(p => daysUntil(p.validTillIso) <= 0);

  const handlePostProduct = () => {
    navigation.navigate('ListProduct');
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
        {hasNoPackages ? (
          <EmptyWalletView onBuyPress={handleBuyMore} />
        ) : (
          <>
            {/* Hero */}
            <View style={styles.heroCard}>
              <Text style={styles.heroAvail}>
                {availableSlots}{' '}
                {availableSlots === 1 ? 'slot' : 'slots'} available
              </Text>
              <Text style={styles.heroSub}>
                across {activePackages.length} active{' '}
                {activePackages.length === 1 ? 'pack' : 'packs'}
              </Text>
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

            {allExpired ? (
              <View style={styles.expiredBanner}>
                <AlertTriangle
                  size={layout.iconSize.sm}
                  color={colors.error}
                />
                <Text style={styles.expiredText}>
                  No active slots. Buy a new pack to continue posting.
                </Text>
              </View>
            ) : null}

            {/* Slot usage */}
            <SectionLabel text="Slot usage" />
            <View style={styles.usageCard}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${usagePct * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.usageLegend}>
                {usedSlots} used / {totalSlots} total
              </Text>
            </View>

            {/* Active packages */}
            <SectionLabel text="Active packages" />
            <View style={styles.sectionGroup}>
              {activePackages.map(pkg => (
                <ActivePackageRow key={pkg.id} pkg={pkg} />
              ))}
            </View>

            {/* Ledger */}
            <SectionLabel text="Activity" />
            <View style={styles.sectionGroup}>
              {ledger.map((entry, i) => (
                <LedgerRow
                  key={entry.id}
                  entry={entry}
                  isLast={i === ledger.length - 1}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ---- Subcomponents ----------------------------------------------------------

const SectionLabel: React.FC<{ text: string }> = ({ text }) => (
  <Text style={styles.sectionLabel}>{text.toUpperCase()}</Text>
);

const ActivePackageRow: React.FC<{ pkg: ActivePackage }> = ({ pkg }) => {
  const remainingDays = daysUntil(pkg.validTillIso);
  const expiringSoon = remainingDays > 0 && remainingDays <= 7;
  const expired = remainingDays <= 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.activeRow,
        pressed && styles.activeRowPressed,
      ]}
    >
      <View style={styles.activeIconWrap}>
        <PackageIcon size={layout.iconSize.base} color={colors.primary} />
      </View>
      <View style={styles.activeText}>
        <Text style={styles.activeName}>
          {pkg.name} · {pkg.postSlots}{' '}
          {pkg.postSlots === 1 ? 'slot' : 'slots'}
        </Text>
        {expired ? (
          <View style={styles.expiryRow}>
            <Text style={styles.expiryExpired}>Expired</Text>
          </View>
        ) : expiringSoon ? (
          <View style={styles.expiryRow}>
            <Text style={styles.expiryWarning}>
              ⚠ Expires in {remainingDays}{' '}
              {remainingDays === 1 ? 'day' : 'days'}
            </Text>
          </View>
        ) : (
          <Text style={styles.activeSub}>
            Valid till {formatShortDate(pkg.validTillIso)} ·{' '}
            {formatINR(pkg.pricePaidInPaise)} paid
          </Text>
        )}
      </View>
      <ChevronRight size={layout.iconSize.md} color={colors.textMuted} />
    </Pressable>
  );
};

const LedgerRow: React.FC<{ entry: LedgerEntry; isLast: boolean }> = ({
  entry,
  isLast,
}) => {
  const isCredit = entry.kind === 'credit';
  return (
    <View style={[styles.ledgerRow, !isLast && styles.ledgerRowDivider]}>
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
          {entry.slots} {entry.slots === 1 ? 'slot' : 'slots'}
        </Text>
        <Text style={styles.ledgerReason}>{entry.reason}</Text>
      </View>
      <Text style={styles.ledgerDate}>{formatShortDate(entry.atIso)}</Text>
    </View>
  );
};

const EmptyWalletView: React.FC<{ onBuyPress: () => void }> = ({
  onBuyPress,
}) => (
  <View style={styles.emptyWrap}>
    <View style={styles.emptyIconCircle}>
      <Inbox size={layout.iconSize.xl} color={colors.textMuted} />
    </View>
    <Text style={styles.emptyTitle}>No active slots yet</Text>
    <Text style={styles.emptyBody}>
      Buy your first pack to start posting products on OneTap.
    </Text>
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

const ACTIVE_ICON_CIRCLE = 40;
const LEDGER_ICON_CIRCLE = 28;
const BAR_HEIGHT = 8;

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

  // Expired banner
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  expiredText: {
    flex: 1,
    ...typography.caption,
    color: colors.textPrimary,
  },

  // Section label
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },

  // Usage card
  usageCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  barTrack: {
    width: '100%',
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: colors.whiteAlpha04,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: BAR_HEIGHT / 2,
  },
  usageLegend: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // Section group (card with rows inside)
  sectionGroup: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },

  // Active package row
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  activeRowPressed: {
    backgroundColor: colors.whiteAlpha04,
  },
  activeIconWrap: {
    width: ACTIVE_ICON_CIRCLE,
    height: ACTIVE_ICON_CIRCLE,
    borderRadius: ACTIVE_ICON_CIRCLE / 2,
    backgroundColor: colors.primaryAlpha15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeText: {
    flex: 1,
  },
  activeName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  activeSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing['2xs'],
  },
  expiryRow: {
    marginTop: spacing['2xs'],
  },
  expiryWarning: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
  },
  expiryExpired: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '700',
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
  ledgerIconWrap: {
    width: LEDGER_ICON_CIRCLE,
    height: LEDGER_ICON_CIRCLE,
    borderRadius: LEDGER_ICON_CIRCLE / 2,
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
