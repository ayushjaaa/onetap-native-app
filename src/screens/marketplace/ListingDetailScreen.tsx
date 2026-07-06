import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  ImageOff,
  MapPin,
  MoreVertical,
  Share2,
  ShoppingBag,
  Trash2,
  X,
  XCircle,
} from 'lucide-react-native';
import { useToast } from '@/hooks/useToast';
import { formatRelativeShort } from '@/data/listingsStub';
import {
  useGetListingByIdQuery,
  useDeleteListingMutation,
} from '@/api/productsApi';
import {
  useExpressInterestMutation,
  useGetMyInterestsAsSellerQuery,
  useSelectBuyerMutation,
} from '@/api/transactionsApi';
import { mapApiError } from '@/utils/errorMapper';
import { useAppSelector } from '@/hooks/useAppSelector';
import type { Interest, Listing } from '@/types';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ListingDetail'>;
type Props = NativeStackScreenProps<MainStackParamList, 'ListingDetail'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const GALLERY_HEIGHT = SCREEN_WIDTH * 0.85;

const formatPricePaise = (paise: number): string =>
  `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

// ---- Screen -----------------------------------------------------------------

export const ListingDetailScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const user = useAppSelector(state => state.auth.user);

  // Seller callers (MyAdsScreen) pass the already-fetched Listing directly —
  // GET /listings/:id is public and only returns Live/Sold listings, so a
  // seller opening their own Pending/Rejected listing would 404 if this
  // screen always re-fetched by id. Only fetch when nothing was passed
  // (e.g. a future buyer-mode/deep-link caller).
  const passedListing = route.params.listing;
  const { data: fetchedListing, isLoading } = useGetListingByIdQuery(
    route.params.listingId,
    { skip: !!passedListing },
  );
  const listing = passedListing ?? fetchedListing ?? null;

  const [deleteListing, { isLoading: removing }] = useDeleteListingMutation();
  const isSellerMode = !!user && listing?.sellerId === user.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [buySheetOpen, setBuySheetOpen] = useState(false);
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false);
  const [selectingInterest, setSelectingInterest] = useState<Interest | null>(
    null,
  );

  const [expressInterest, { isLoading: expressingInterest }] =
    useExpressInterestMutation();
  const [selectBuyer, { isLoading: selectingBuyerLoading }] =
    useSelectBuyerMutation();

  // Only the seller needs their received-interests list, and only while
  // viewing their own Live listing — skip the fetch entirely otherwise.
  const { data: receivedInterestsData } = useGetMyInterestsAsSellerQuery(
    undefined,
    { skip: !isSellerMode || listing?.status !== 'Live' },
  );
  const pendingBuyers = (receivedInterestsData?.interests ?? []).filter(
    i => i.listingId === listing?._id && i.status === 'pending',
  );

  // Defensive: unknown listingId renders an inline error frame instead of
  // crashing on undefined access.
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centeredError}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centeredError}>
          <XCircle size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Listing not found</Text>
          <Text style={styles.errorBody}>
            That listing couldn't be loaded. It may have been removed.
          </Text>
          <Pressable
            style={styles.errorPrimary}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorPrimaryText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isUnavailable = listing.status === 'Sold';

  const handleExpressInterest = async () => {
    try {
      await expressInterest({ listingId: listing._id }).unwrap();
      setBuySheetOpen(false);
      setHasExpressedInterest(true);
      toast.success({
        title: 'Interest sent',
        message: 'The seller has been notified — they may reach out soon.',
      });
    } catch (err) {
      const mapped = mapApiError(err as never);
      setBuySheetOpen(false);
      toast.error({
        title: "Couldn't send interest",
        message: mapped.message,
      });
    }
  };

  const handleSelectBuyer = async () => {
    if (!selectingInterest) return;
    try {
      await selectBuyer({
        interestId: selectingInterest._id,
        listingId: listing._id,
      }).unwrap();
      setSelectingInterest(null);
      toast.success({
        title: 'Buyer selected',
        message: 'This listing is now marked as sold.',
      });
    } catch (err) {
      const mapped = mapApiError(err as never);
      setSelectingInterest(null);
      toast.error({
        title: "Couldn't select buyer",
        message: mapped.message,
      });
    }
  };

  const handleRemove = () => {
    setMenuOpen(false);
    Alert.alert(
      'Remove this listing?',
      'Aapko ek slot wapas mil jayega. Listing permanently delist ho jayegi.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteListing(listing._id).unwrap();
              toast.success({ title: 'Listing removed' });
              navigation.goBack();
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

  // Photos are Cloudinary public_ids, not ready-to-render URLs — there's no
  // buildCloudinaryUrl() helper yet (see integration docs). Real listings
  // don't have photos wired end-to-end today, so the gallery always shows
  // the fallback state rather than attempting to render a broken URI.
  const hasPhotos = false;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Gallery */}
        <View style={styles.galleryWrap}>
          {hasPhotos ? null : (
            <View style={[styles.galleryImage, styles.galleryFallback]}>
              <ImageOff size={layout.iconSize.xl} color={colors.textMuted} />
            </View>
          )}

          {/* Top bar overlay */}
          <View style={styles.topBar}>
            <Pressable
              onPress={navigation.goBack}
              hitSlop={spacing.md}
              style={styles.iconBtn}
            >
              <ChevronLeft size={layout.iconSize.lg} color={colors.white} />
            </Pressable>

            <View style={styles.topBarRight}>
              {isSellerMode ? (
                <Pressable
                  testID="listing-detail-menu-button"
                  onPress={() => setMenuOpen(true)}
                  hitSlop={spacing.md}
                  style={styles.iconBtn}
                >
                  <MoreVertical
                    size={layout.iconSize.md}
                    color={colors.white}
                  />
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() =>
                      toast.info({
                        title: 'Not available yet',
                        message:
                          'Favorites aren’t supported by the backend yet.',
                      })
                    }
                    hitSlop={spacing.md}
                    style={styles.iconBtn}
                  >
                    <Heart size={layout.iconSize.md} color={colors.white} />
                  </Pressable>
                  <Pressable hitSlop={spacing.md} style={styles.iconBtn}>
                    <Share2 size={layout.iconSize.md} color={colors.white} />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Status banner (seller mode only — buyers don't need to see it) */}
        {isSellerMode ? (
          <StatusBanner
            listing={listing}
            onSeeReason={() => setRejectionOpen(true)}
          />
        ) : null}

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.price}>{formatPricePaise(listing.price)}</Text>
          <Text style={styles.title}>{listing.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MapPin size={layout.iconSize.sm} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {listing.address ?? 'Location not set'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={layout.iconSize.sm} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {formatRelativeShort(listing.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{listing.category}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{listing.condition}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>

          {/* Seller-side: buyers who've expressed interest in this Live
              listing, with a "select this buyer" action that marks it Sold.
              Chat and a public seller-info card for buyers are still out of
              scope — see integration docs. */}
          {isSellerMode && listing.status === 'Live' ? (
            <View style={styles.buyersBlock}>
              <Text style={styles.sectionTitle}>
                Interested buyers
                {pendingBuyers.length > 0 ? ` (${pendingBuyers.length})` : ''}
              </Text>
              {pendingBuyers.length === 0 ? (
                <View style={styles.buyersEmpty}>
                  <Text style={styles.buyersEmptyText}>
                    No one has expressed interest yet.
                  </Text>
                </View>
              ) : (
                pendingBuyers.map(interest => (
                  <View key={interest._id} style={styles.buyerRow}>
                    <View style={styles.buyerAvatar}>
                      <Text style={styles.buyerAvatarText}>
                        {interest.buyerId.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.buyerInfo}>
                      <View style={styles.buyerNameRow}>
                        <Text style={styles.buyerName}>Interested buyer</Text>
                        <Text style={styles.buyerTime}>
                          {formatRelativeShort(interest.createdAt)}
                        </Text>
                      </View>
                      {interest.message ? (
                        <Text style={styles.buyerLocation}>
                          "{interest.message}"
                        </Text>
                      ) : null}
                      <View style={styles.buyerBtns}>
                        <Pressable
                          onPress={() => setSelectingInterest(interest)}
                          style={styles.buyerSellBtn}
                        >
                          <Text style={styles.buyerSellText}>
                            Select this buyer
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky bottom bar — buyer mode only. */}
      {!isSellerMode ? (
        <View style={styles.bottomBar}>
          {isUnavailable ? (
            <View style={styles.unavailableBar}>
              <XCircle size={layout.iconSize.sm} color={colors.textMuted} />
              <Text style={styles.unavailableText}>
                This product is no longer available
              </Text>
            </View>
          ) : hasExpressedInterest ? (
            <View style={styles.unavailableBar}>
              <Clock size={layout.iconSize.sm} color={colors.warning} />
              <Text style={styles.unavailableText}>
                Interest sent — awaiting seller
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setBuySheetOpen(true)}
              style={({ pressed }) => [
                styles.buyBtn,
                pressed && styles.buyBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Buy this product, cash on delivery"
            >
              <ShoppingBag size={layout.iconSize.md} color={colors.white} />
              <View style={styles.buyTextWrap}>
                <Text style={styles.buyTextPrimary}>Buy this product</Text>
                <Text style={styles.buyTextSecondary}>
                  Cash on Delivery only
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      ) : null}

      {/* Seller-mode 3-dot menu */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.menuPanel}>
            {listing.status === 'Live' || listing.status === 'Pending' ? (
              <Pressable
                onPress={handleRemove}
                disabled={removing}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <Trash2 size={layout.iconSize.sm} color={colors.error} />
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                  {removing ? 'Removing…' : 'Remove listing'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => setMenuOpen(false)}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
            >
              <Text style={styles.menuItemText}>Report a bug</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Rejection reason sheet (seller mode) */}
      <Modal
        visible={rejectionOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectionOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setRejectionOpen(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Rejection reason</Text>
            <Pressable
              onPress={() => setRejectionOpen(false)}
              hitSlop={spacing.sm}
              style={styles.sheetClose}
            >
              <X size={layout.iconSize.md} color={colors.textPrimary} />
            </Pressable>
          </View>
          <View style={styles.sheetReasonBox}>
            <XCircle size={layout.iconSize.base} color={colors.error} />
            <Text style={styles.sheetReasonText}>
              {listing.rejectionReason ?? 'Admin did not provide a reason.'}
            </Text>
          </View>
          <Text style={styles.sheetHint}>
            Listings are immutable — rejected listings can't be edited. Naya
            listing post karein (1 slot consume hoga).
          </Text>
        </View>
      </Modal>

      {/* Buy confirm sheet (buyer mode) */}
      <Modal
        visible={buySheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBuySheetOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setBuySheetOpen(false)}
        />
        <View style={styles.buySheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.buyRecap}>
            <View style={[styles.buyRecapThumb, styles.galleryFallback]}>
              <ImageOff size={layout.iconSize.md} color={colors.textMuted} />
            </View>
            <View style={styles.buyRecapText}>
              <Text style={styles.buyRecapTitle} numberOfLines={2}>
                {listing.title}
              </Text>
              <Text style={styles.buyRecapPrice}>
                {formatPricePaise(listing.price)}
              </Text>
            </View>
          </View>
          <Text style={styles.buySheetHeading}>Express interest?</Text>
          <Text style={styles.buySheetBody}>
            The seller will see that you're interested and can choose to sell to
            you. This isn't a payment — Cash on Delivery only.
          </Text>
          <View style={styles.buyPrivacyCard}>
            <CheckCircle2 size={layout.iconSize.sm} color={colors.primary} />
            <Text style={styles.buyPrivacyText}>
              Your contact details are only shared if the seller selects you.
            </Text>
          </View>
          <View style={styles.buyBtnRow}>
            <Pressable
              onPress={() => setBuySheetOpen(false)}
              disabled={expressingInterest}
              style={[
                styles.buyCancelBtn,
                expressingInterest && styles.buyCancelBtnDisabled,
              ]}
            >
              <Text style={styles.buyCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleExpressInterest}
              disabled={expressingInterest}
              style={[
                styles.buyConfirmBtn,
                expressingInterest && styles.buyConfirmBtnLoading,
              ]}
            >
              {expressingInterest ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.buyConfirmText}>Confirm interest</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Select-buyer confirm modal (seller mode) */}
      <Modal
        visible={!!selectingInterest}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectingInterest(null)}
      >
        <Pressable
          style={styles.confirmBackdrop}
          onPress={() => setSelectingInterest(null)}
        >
          <Pressable
            style={styles.confirmCard}
            onPress={e => e.stopPropagation()}
          >
            <Text style={styles.confirmTitle}>Select this buyer?</Text>
            <Text style={styles.confirmBody}>
              This marks the listing as Sold and rejects every other interested
              buyer. This can't be undone.
            </Text>
            <View style={styles.confirmHint}>
              <CheckCircle2 size={layout.iconSize.sm} color={colors.primary} />
              <Text style={styles.confirmHintText}>
                {formatPricePaise(listing.price)} for {listing.title}
              </Text>
            </View>
            <View style={styles.confirmBtnRow}>
              <Pressable
                onPress={() => setSelectingInterest(null)}
                disabled={selectingBuyerLoading}
                style={styles.confirmCancelBtn}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSelectBuyer}
                disabled={selectingBuyerLoading}
                style={styles.confirmHoldBtn}
              >
                {selectingBuyerLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.confirmHoldText}>Confirm sale</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

// ---- Subcomponents ----------------------------------------------------------

interface StatusBannerProps {
  listing: Listing;
  onSeeReason: () => void;
}

const StatusBanner: React.FC<StatusBannerProps> = ({
  listing,
  onSeeReason,
}) => {
  const { status, soldAt, expiredAt } = listing;

  if (status === 'Pending') {
    return (
      <View style={[styles.statusBanner, styles.statusPending]}>
        <Clock size={layout.iconSize.sm} color={colors.warning} />
        <Text style={styles.statusText}>Pending admin review.</Text>
      </View>
    );
  }
  if (status === 'Live') {
    return (
      <View style={[styles.statusBanner, styles.statusLive]}>
        <CheckCircle2 size={layout.iconSize.sm} color={colors.success} />
        <Text style={styles.statusText}>Live</Text>
      </View>
    );
  }
  if (status === 'Rejected') {
    return (
      <Pressable
        onPress={onSeeReason}
        style={[styles.statusBanner, styles.statusRejected]}
      >
        <XCircle size={layout.iconSize.sm} color={colors.error} />
        <Text style={[styles.statusText, styles.statusTextLink]}>
          Rejected — see reason
        </Text>
        <ChevronRight size={layout.iconSize.sm} color={colors.error} />
      </Pressable>
    );
  }
  if (status === 'Expired') {
    return (
      <View style={[styles.statusBanner, styles.statusRejected]}>
        <Clock size={layout.iconSize.sm} color={colors.textMuted} />
        <Text style={styles.statusText}>
          Expired{expiredAt ? ` on ${formatRelativeShort(expiredAt)}` : ''} —
          repost to make it live again.
        </Text>
      </View>
    );
  }
  if (status === 'Sold') {
    return (
      <View style={[styles.statusBanner, styles.statusSold]}>
        <CheckCircle2 size={layout.iconSize.sm} color={colors.textMuted} />
        <Text style={styles.statusText}>
          Sold {soldAt ? `on ${formatRelativeShort(soldAt)}` : ''}
        </Text>
      </View>
    );
  }
  return null;
};

const cardPressed = { opacity: 0.9, transform: [{ scale: 0.99 }] } as const;
void cardPressed;

// ---- Styles -----------------------------------------------------------------

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing['5xl'],
  },

  // Gallery
  galleryWrap: {
    position: 'relative',
    backgroundColor: colors.surface,
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT,
    backgroundColor: colors.surface,
  },
  galleryDim: {
    opacity: 0.6,
  },
  galleryFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBtn: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: spacing.sm / 2,
    backgroundColor: colors.whiteAlpha04,
    borderWidth: 1,
    borderColor: colors.white,
  },
  dotActive: {
    backgroundColor: colors.white,
  },

  // Status banner (seller mode)
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
  },
  statusLive: {
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  statusRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
  },
  statusSold: {
    backgroundColor: colors.card,
  },
  statusText: {
    flex: 1,
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  statusTextLink: {
    color: colors.error,
    fontWeight: '700',
  },

  // Body
  body: {
    padding: spacing.lg,
  },
  price: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    color: colors.primary,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  interestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  interestPillText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.warning,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.base,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
  },
  tagText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: fontSize.base * 1.6,
  },

  // Seller card (buyer mode)
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  sellerAvatar: {
    width: layout.emptyIconCircle / 2,
    height: layout.emptyIconCircle / 2,
    borderRadius: layout.emptyIconCircle / 4,
    backgroundColor: colors.primaryAlpha15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarText: {
    color: colors.primary,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sellerName: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  sellerMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing['2xs'],
  },

  // Bottom bar (buyer)
  bottomBar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeightMd,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatText: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  callBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeightMd,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  callText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '700',
    flexShrink: 1,
  },

  // Buy CTA (pre-interest)
  buyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    height: layout.buttonHeight,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },
  buyBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  buyTextWrap: {
    alignItems: 'center',
  },
  buyTextPrimary: {
    ...typography.button,
    color: colors.white,
  },
  buyTextSecondary: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing['2xs'],
  },

  // Unavailable state
  unavailableBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unavailableText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },

  // Interested buyers section
  buyersBlock: {
    marginTop: spacing.xl,
  },
  buyersEmpty: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
  },
  buyersEmptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  buyerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm,
  },
  buyerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryAlpha15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerAvatarText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  buyerInfo: {
    flex: 1,
  },
  buyerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buyerName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  buyerTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  buyerLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing['2xs'],
  },
  buyerBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  buyerChatBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buyerChatText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  buyerSellBtn: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  buyerSellText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },

  // 3-dot menu
  menuBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  menuPanel: {
    position: 'absolute',
    top: 70,
    right: spacing.lg,
    minWidth: 180,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  menuItemPressed: {
    backgroundColor: colors.whiteAlpha04,
  },
  menuItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  menuItemDanger: {
    color: colors.error,
    fontWeight: '700',
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
  sheetClose: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: fontSize.sm * 1.6,
  },

  // Sell-to confirm modal
  confirmBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  confirmBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: fontSize.base * 1.5,
    marginBottom: spacing.md,
  },
  confirmHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    marginBottom: spacing.lg,
  },
  confirmHintText: {
    flex: 1,
    ...typography.caption,
    color: colors.textPrimary,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmCancelBtn: {
    flex: 1,
    height: layout.buttonHeightMd,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  confirmHoldBtn: {
    flex: 2,
    height: layout.buttonHeightMd,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  confirmHoldFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  confirmHoldText: {
    ...typography.button,
    color: colors.white,
  },

  // Error frame
  centeredError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.base,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  errorBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorPrimary: {
    marginTop: spacing.lg,
    height: layout.buttonHeight,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorPrimaryText: {
    ...typography.button,
    color: colors.white,
  },

  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },

  // Buy confirm sheet
  buySheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  buyRecap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  buyRecapThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  buyRecapText: {
    flex: 1,
  },
  buyRecapTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  buyRecapPrice: {
    ...typography.h4,
    color: colors.primary,
  },
  buySheetHeading: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  buySheetBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: fontSize.base * 1.6,
    marginBottom: spacing.lg,
  },
  buyPrivacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    marginBottom: spacing.lg,
  },
  buyPrivacyText: {
    flex: 1,
    ...typography.caption,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.5,
  },
  buyBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  buyCancelBtn: {
    flex: 1,
    height: layout.buttonHeightMd,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyCancelBtnDisabled: {
    opacity: 0.5,
  },
  buyCancelText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  buyConfirmBtn: {
    flex: 2,
    height: layout.buttonHeightMd,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyConfirmBtnLoading: {
    opacity: 0.8,
  },
  buyConfirmText: {
    ...typography.button,
    color: colors.white,
  },
});
