import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Tag,
  Wallet,
  X,
  XCircle,
} from 'lucide-react-native';
import { EmptyState } from '@/components/marketplace';
import { ShimmerCard } from '@/components/common/Shimmer';
import { formatINR } from '@/data/packagesCatalog';
import {
  useGetMyListingsQuery,
  useDeleteListingMutation,
} from '@/api/productsApi';
import { mapApiError } from '@/utils/errorMapper';
import { useToast } from '@/hooks/useToast';
import { useAppSelector } from '@/hooks/useAppSelector';
import { resolvePostAdDestination } from '@/navigation/postAdRouter';
import { buildMediaUrl } from '@/utils/media';
import type { Listing } from '@/types';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

// UI tabs are a client-side simplification of the backend's 7 real listing
// statuses. `Expired` has no tab of its own — folded into `rejected` (both
// mean "not currently active, seller should act"), and `Draft`/`Deleted`
// never appear here (create always lands on `Pending`; deleted listings are
// soft-deleted and intentionally excluded from `GET /listings/mine`'s own
// results by nothing — the backend still returns them, so this screen
// filters them out itself, see `toMyListing`/`isVisibleInMyAds` below).
type ListingStatus = 'pending' | 'live' | 'rejected' | 'sold';

interface MyListing {
  id: string;
  title: string;
  priceInPaise: number;
  status: ListingStatus;
  postedAtIso: string;
  isExpired?: boolean;
  photoUrl?: string;
  // Pending
  reviewEtaHours?: number;
  // Rejected
  rejectionReason?: string;
  // Sold
  soldToName?: string;
  soldAtIso?: string;
  transactionId?: string;
}

const isVisibleInMyAds = (l: Listing): boolean => l.status !== 'Deleted';

const toMyListing = (l: Listing): MyListing => {
  const statusMap: Record<string, ListingStatus> = {
    Draft: 'pending',
    Pending: 'pending',
    Live: 'live',
    Rejected: 'rejected',
    Expired: 'rejected',
    Sold: 'sold',
  };
  return {
    id: l._id,
    title: l.title,
    priceInPaise: l.price,
    status: statusMap[l.status] ?? 'pending',
    postedAtIso: l.createdAt,
    isExpired: l.status === 'Expired',
    photoUrl: l.photos?.[0],
    rejectionReason: l.rejectionReason,
    soldAtIso: l.soldAt,
  };
};

const EMPTY_LISTINGS: Listing[] = [];

const TABS: Array<{ key: ListingStatus; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'live', label: 'Live' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'sold', label: 'Sold' },
];

const formatShortDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// ---- Screen -----------------------------------------------------------------

export const MyAdsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const user = useAppSelector(state => state.auth.user);

  const [activeTab, setActiveTab] = useState<ListingStatus>('live');
  const [rejectionSheet, setRejectionSheet] = useState<MyListing | null>(null);

  const { data, isLoading, refetch } = useGetMyListingsQuery();
  const [deleteListing] = useDeleteListingMutation();

  // Admin approval/rejection happens out-of-band (admin dashboard, not this
  // app), so the RTK Query cache has no way to know a listing's status
  // changed server-side. Refetch every time this screen regains focus so a
  // seller returning here sees the current status instead of a stale cache.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const rawListings = data?.listings ?? EMPTY_LISTINGS;
  const listings = useMemo(
    () => rawListings.filter(isVisibleInMyAds).map(toMyListing),
    [rawListings],
  );
  const slotsAvailable = data?.summary.slotsRemaining ?? 0;

  const counts = useMemo(() => {
    const c: Record<ListingStatus, number> = {
      pending: 0,
      live: 0,
      rejected: 0,
      sold: 0,
    };
    for (const l of listings) c[l.status] += 1;
    return c;
  }, [listings]);

  const visible = useMemo(
    () => listings.filter(l => l.status === activeTab),
    [listings, activeTab],
  );

  const handleOpenListing = (listing: MyListing) => {
    // Pass the already-fetched raw Listing through navigation params instead
    // of having ListingDetailScreen re-fetch by id: GET /listings/:id is
    // public and only returns Live/Sold listings (404s for Pending/
    // Rejected/Draft/Expired), so a seller tapping into their own
    // not-yet-approved listing would otherwise hit a false "not found".
    const raw = rawListings.find(l => l._id === listing.id);
    navigation.navigate('ListingDetail', {
      listingId: listing.id,
      listing: raw,
    });
  };

  const handleRemove = (listing: MyListing) => {
    Alert.alert(
      'Remove this listing?',
      'You’ll get a slot back. This listing will be permanently delisted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteListing(listing.id).unwrap();
            } catch (err) {
              const mapped = mapApiError(err as never);
              toast.error({
                title: "Couldn't remove listing",
                message: mapped.message,
              });
            }
          },
        },
      ],
    );
  };

  const handleViewTransaction = (_listing: MyListing) => {
    // S14 doesn't take a transactionId param yet — the screen lists all
    // sales and the seller can identify this one visually. Per-sale receipt
    // detail lands in v1.5 (TransactionDetail route).
    navigation.navigate('SalesHistory');
  };

  // This tab is reachable by every logged-in user, not just approved
  // sellers — a buyer with zero ads (or a mid-onboarding/rejected seller)
  // can land here and tap "Post a new ad". Route through the same resume
  // logic as the Home FAB instead of assuming they're already clear to post.
  const handlePostNew = () => {
    navigation.navigate(resolvePostAdDestination(user) as never);
  };

  const handleOpenWallet = () => {
    navigation.navigate('ProductWallet');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Ads</Text>
        <Pressable onPress={handleOpenWallet} style={styles.walletChip}>
          <Wallet size={layout.iconSize.sm} color={colors.primary} />
          <Text style={styles.walletChipText}>
            {isLoading ? 'Wallet' : `${slotsAvailable} slots · Wallet`}
          </Text>
          <ChevronRight size={layout.iconSize.sm} color={colors.primary} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const count = counts[tab.key];
          return (
            <Pressable
              key={tab.key}
              testID={`my-ads-tab-${tab.key}`}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, isActive && styles.tabActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[styles.tabText, isActive && styles.tabTextActive]}
                numberOfLines={1}
              >
                {tab.label}
                {count > 0 ? ` · ${count}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="my-ads-list"
      >
        {isLoading ? (
          <>
            <ShimmerCard />
            <ShimmerCard />
          </>
        ) : visible.length === 0 ? (
          <EmptyTabState tab={activeTab} onPostNew={handlePostNew} />
        ) : (
          visible.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onOpen={() => handleOpenListing(listing)}
              onRemove={() => handleRemove(listing)}
              onSeeReason={() => setRejectionSheet(listing)}
              onViewTransaction={() => handleViewTransaction(listing)}
            />
          ))
        )}
      </ScrollView>

      <RejectionReasonSheet
        listing={rejectionSheet}
        onClose={() => setRejectionSheet(null)}
        onRepost={() => {
          setRejectionSheet(null);
          handlePostNew();
        }}
      />
    </SafeAreaView>
  );
};

// ---- Subcomponents ----------------------------------------------------------

interface ListingCardProps {
  listing: MyListing;
  onOpen: () => void;
  onRemove: () => void;
  onSeeReason: () => void;
  onViewTransaction: () => void;
}

const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onOpen,
  onRemove,
  onSeeReason,
  onViewTransaction,
}) => {
  const isDim = listing.status === 'rejected' || listing.status === 'sold';

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardTopRow}>
        {listing.photoUrl ? (
          <Image
            source={{ uri: buildMediaUrl(listing.photoUrl) }}
            style={[styles.thumb, isDim && styles.thumbDim]}
          />
        ) : (
          <View
            style={[
              styles.thumb,
              { backgroundColor: stubThumbColour(listing.id) },
              isDim && styles.thumbDim,
            ]}
          />
        )}
        <View style={styles.cardText}>
          <Text
            style={[styles.cardTitle, isDim && styles.cardTitleDim]}
            numberOfLines={2}
          >
            {listing.title}
          </Text>
          <Text style={[styles.cardPrice, isDim && styles.cardTitleDim]}>
            {formatINR(listing.priceInPaise)}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        {listing.status === 'pending' ? (
          <View style={styles.footerRow}>
            <Clock size={layout.iconSize.sm} color={colors.warning} />
            <Text style={styles.footerText}>
              Awaiting admin review (~{listing.reviewEtaHours ?? 24}h)
            </Text>
          </View>
        ) : null}

        {listing.status === 'live' ? (
          <View style={styles.liveFooter}>
            {/* View/interest counts aren't tracked by the backend today —
                see integration docs; showing a fake 0 would be misleading,
                so this row is intentionally just the Remove action. */}
            <View style={styles.statsRow} />
            <Pressable
              onPress={onRemove}
              hitSlop={spacing.sm}
              style={styles.removeBtn}
            >
              <Text style={styles.removeBtnText}>Remove</Text>
            </Pressable>
          </View>
        ) : null}

        {listing.status === 'rejected' && listing.isExpired ? (
          <View style={styles.footerRow}>
            <Clock size={layout.iconSize.sm} color={colors.textMuted} />
            <Text style={styles.footerText}>
              Listing expired — repost to make it live again.
            </Text>
          </View>
        ) : listing.status === 'rejected' ? (
          <Pressable onPress={onSeeReason} style={styles.footerRow}>
            <XCircle size={layout.iconSize.sm} color={colors.error} />
            <Text style={[styles.footerText, styles.footerTextLink]}>
              See rejection reason
            </Text>
            <ChevronRight size={layout.iconSize.sm} color={colors.error} />
          </Pressable>
        ) : null}

        {listing.status === 'sold' ? (
          <View>
            <View style={styles.footerRow}>
              <CheckCircle2 size={layout.iconSize.sm} color={colors.success} />
              <Text style={styles.footerText}>
                Sold to {listing.soldToName ?? 'a buyer'}
                {listing.soldAtIso
                  ? ` · ${formatShortDate(listing.soldAtIso)}`
                  : ''}
              </Text>
            </View>
            <Pressable
              onPress={onViewTransaction}
              hitSlop={spacing.sm}
              style={styles.linkBtn}
            >
              <Text style={styles.linkBtnText}>View transaction →</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};

interface EmptyTabStateProps {
  tab: ListingStatus;
  onPostNew: () => void;
}

const EmptyTabState: React.FC<EmptyTabStateProps> = ({ tab, onPostNew }) => {
  const copy = EMPTY_COPY[tab];
  return (
    <View style={styles.emptyWrap}>
      <EmptyState
        icon={Tag}
        title={copy.title}
        message={copy.body}
        actionLabel={copy.cta}
        onActionPress={copy.showCta ? onPostNew : undefined}
      />
    </View>
  );
};

const EMPTY_COPY: Record<
  ListingStatus,
  { title: string; body: string; cta?: string; showCta: boolean }
> = {
  pending: {
    title: 'No pending ads',
    body: 'You haven’t posted anything yet.',
    cta: 'Post a new ad',
    showCta: true,
  },
  live: {
    title: 'No live ads',
    body: 'Your live listings will show up here.',
    cta: 'Post a new ad',
    showCta: true,
  },
  rejected: {
    title: 'No rejected ads — good going!',
    body: 'All clear. Keep following the listing guidelines.',
    cta: 'Post a new ad',
    showCta: true,
  },
  sold: {
    title: 'No sales yet',
    body: 'Listings will move here once they sell.',
    cta: 'Post a new ad',
    showCta: true,
  },
};

interface RejectionReasonSheetProps {
  listing: MyListing | null;
  onClose: () => void;
  onRepost: () => void;
}

const RejectionReasonSheet: React.FC<RejectionReasonSheetProps> = ({
  listing,
  onClose,
  onRepost,
}) => {
  const visible = !!listing;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Rejection reason</Text>
          <Pressable
            onPress={onClose}
            hitSlop={spacing.sm}
            style={styles.sheetCloseBtn}
          >
            <X size={layout.iconSize.md} color={colors.textPrimary} />
          </Pressable>
        </View>
        {listing ? (
          <>
            <Text style={styles.sheetListingTitle}>{listing.title}</Text>
            <View style={styles.sheetReasonBox}>
              <XCircle size={layout.iconSize.base} color={colors.error} />
              <Text style={styles.sheetReasonText}>
                {listing.rejectionReason ?? 'Admin did not provide a reason.'}
              </Text>
            </View>
            <Text style={styles.sheetHint}>
              Rejected listings can't be edited. You can post a new listing
              instead (uses 1 slot).
            </Text>
            <Pressable
              onPress={onRepost}
              style={({ pressed }) => [
                styles.sheetPrimary,
                pressed && styles.cardPressed,
              ]}
            >
              <Text style={styles.sheetPrimaryText}>Post a new listing</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </Modal>
  );
};

// ---- Helpers ----------------------------------------------------------------

const STUB_PALETTE = [
  '#2BB32A',
  '#3B82F6',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#10B981',
  '#EC4899',
];

const stubThumbColour = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % 1000;
  return STUB_PALETTE[hash % STUB_PALETTE.length];
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryAlpha15,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
  },
  walletChipText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
    flexGrow: 1,
  },

  // Card
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
    opacity: 0.5,
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
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  footerTextLink: {
    color: colors.error,
    fontWeight: '700',
  },
  liveFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    flex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  removeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeBtnText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  linkBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  linkBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },

  // Empty
  emptyWrap: {
    flex: 1,
    paddingTop: spacing['2xl'],
  },

  // Rejection sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: layout.sheetHandleWidth,
    height: layout.sheetHandleHeight,
    borderRadius: radius.xs,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sheetCloseBtn: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetListingTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sheetReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    marginBottom: spacing.lg,
  },
  sheetReasonText: {
    flex: 1,
    ...typography.caption,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.6,
  },
  sheetHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: fontSize.sm * 1.6,
  },
  sheetPrimary: {
    height: layout.buttonHeightMd,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPrimaryText: {
    ...typography.button,
    color: colors.white,
  },
});
