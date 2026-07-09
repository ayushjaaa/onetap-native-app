import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
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
import { skipToken } from '@reduxjs/toolkit/query/react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  ImageOff,
  Info,
  MapPin,
  MessageCircle,
  MoreVertical,
  Phone,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react-native';
import { useToast } from '@/hooks/useToast';
import { useAppSelector } from '@/hooks/useAppSelector';
import { formatINR } from '@/data/packagesCatalog';
import { formatRelativeShort, stubThumbColour } from '@/data/listingsStub';
import {
  useExpressInterestMutation,
  useGetListingQuery,
  useDeleteListingMutation,
} from '@/api/productsApi';
import { useGetReceivedInterestsQuery } from '@/api/interestsApi';
import { useSelectBuyerMutation } from '@/api/transactionsApi';
import { getDistanceKm } from '@/utils/geo';
import { buildMediaUrl } from '@/utils/media';
import { mapApiError } from '@/utils/errorMapper';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';
import type { Interest, Listing, ListingStatus } from '@/types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ListingDetail'>;
type Props = NativeStackScreenProps<MainStackParamList, 'ListingDetail'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const GALLERY_HEIGHT = SCREEN_WIDTH * 0.85;

const HOLD_TO_CONFIRM_MS = 1000;

// Local view-model for a seller's received interest, derived from the real
// Interest doc + the seller's own device location (for distanceKm).
interface InterestedBuyer {
  id: string;
  name: string;
  initial: string;
  phone?: string;
  locationLabel: string;
  distanceKm: number | null;
  interestedAtIso: string;
}

const toInterestedBuyer = (
  interest: Interest,
  deviceLat: number | null,
  deviceLng: number | null,
): InterestedBuyer => {
  const name = interest.buyerName?.trim() || 'Interested buyer';
  const [buyerLng, buyerLat] = interest.buyerLocation?.coordinates ?? [];
  const distanceKm =
    deviceLat != null &&
    deviceLng != null &&
    buyerLat != null &&
    buyerLng != null
      ? Math.round(getDistanceKm(deviceLat, deviceLng, buyerLat, buyerLng))
      : null;
  return {
    id: interest._id,
    name,
    initial: name.charAt(0).toUpperCase(),
    phone: interest.buyerPhone,
    locationLabel: buyerLat != null ? 'Nearby buyer' : 'Location not shared',
    distanceKm,
    interestedAtIso: interest.createdAt,
  };
};

// ---- Screen -----------------------------------------------------------------

export const ListingDetailScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const currentUserId = useAppSelector(state => state.auth.user?.id);
  const deviceLocation = useAppSelector(state => state.location);

  // Seller callers (MyAdsScreen) pass the already-fetched Listing directly —
  // GET /listings/:id is public and only returns Live/Sold listings, so a
  // seller opening their own Pending/Rejected listing would 404 if this
  // screen always re-fetched by id. Only fetch when nothing was passed.
  const passedListing = route.params.listing;
  const {
    data: listingData,
    isLoading: isListingLoading,
    error: listingError,
  } = useGetListingQuery(passedListing ? skipToken : route.params.listingId);

  // Local mutable copy seeded from whichever source applies — lets the
  // seller's "sell to this buyer" hold-to-confirm action optimistically
  // reflect a Sold state the instant selectBuyer resolves, without waiting
  // on a refetch.
  const [listing, setListing] = useState<Listing | null>(passedListing ?? null);
  useEffect(() => {
    if (listingData?.listing) setListing(listingData.listing);
  }, [listingData]);

  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [sellTarget, setSellTarget] = useState<InterestedBuyer | null>(null);
  const [buyConfirmOpen, setBuyConfirmOpen] = useState(false);

  const [expressInterest, { isLoading: buyConfirming }] =
    useExpressInterestMutation();
  const [deleteListing, { isLoading: removing }] = useDeleteListingMutation();
  const [selectBuyer] = useSelectBuyerMutation();

  const isSellerMode = !!listing && listing.sellerId === currentUserId;

  const { data: receivedInterestsData } = useGetReceivedInterestsQuery(
    isSellerMode && listing?.status === 'Live' ? undefined : skipToken,
  );
  console.log(
    '[ListingDetailScreen] GET /marketplace/interests/received raw response:',
    JSON.stringify(receivedInterestsData, null, 2),
  );
  const interestedBuyers: InterestedBuyer[] = (
    receivedInterestsData?.interests ?? []
  )
    .filter(i => i.listingId === listing?._id)
    .map(i =>
      toInterestedBuyer(i, deviceLocation.latitude, deviceLocation.longitude),
    );

  // Loading / not-found: query still in flight, or unknown/removed listingId.
  if (isListingLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centeredError}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!listing || listingError) {
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

  const [sellerLng, sellerLat] = listing.seller?.location?.coordinates ?? [];
  const sellerDistanceKm =
    deviceLocation.latitude != null &&
    deviceLocation.longitude != null &&
    sellerLat != null &&
    sellerLng != null
      ? Math.round(
          getDistanceKm(
            deviceLocation.latitude,
            deviceLocation.longitude,
            sellerLat,
            sellerLng,
          ),
        )
      : null;

  const handleBuyTap = () => {
    if (isUnavailable || hasExpressedInterest) return;
    setBuyConfirmOpen(true);
  };

  const handleBuyConfirm = async () => {
    try {
      await expressInterest({ listingId: listing._id }).unwrap();

      setHasExpressedInterest(true);
      setBuyConfirmOpen(false);
      toast.success({
        title: 'Interest sent',
        message: `${
          listing.seller?.name ?? 'Seller'
        } ko notify kar diya. Chat ya call ready hai.`,
      });
    } catch (err: any) {
      if (err?.status === 409) {
        // Already expressed interest previously (e.g. re-tapped after a reload) —
        // treat as success so the buyer still reaches the Chat/Call state.
        setHasExpressedInterest(true);
        setBuyConfirmOpen(false);
        return;
      }
      toast.error({
        title: "Couldn't send interest",
        message: 'Network issue — phir try karein.',
      });
    }
  };

  const handleCallSeller = () => {
    const phone = listing.seller?.phone;
    if (!phone) {
      toast.info({
        title: 'Number not available',
        message: "Seller hasn't verified their phone number yet.",
      });
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenChat = () => {
    navigation.navigate('ChatConversation', {
      listingId: listing._id,
      counterpartyId: listing.seller?.id,
      counterpartyName: listing.seller?.name,
    });
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

  const handleSellTo = (buyer: InterestedBuyer) => setSellTarget(buyer);

  const handleSellConfirmed = async () => {
    if (!sellTarget || !listing) return;
    try {
      await selectBuyer({
        interestId: sellTarget.id,
        listingId: listing._id,
      }).unwrap();
      // Optimistic local flip so the screen reflects Sold immediately —
      // selectBuyer's cache invalidation will reconcile with the server
      // response shortly after.
      setListing(prev =>
        prev
          ? {
              ...prev,
              status: 'Sold',
              soldAt: new Date().toISOString(),
            }
          : prev,
      );
      const soldToName = sellTarget.name;
      setSellTarget(null);
      toast.success({
        title: 'Sale recorded',
        message: `Sold to ${soldToName}. Slot wapas Wallet mein add ho gaya.`,
      });
    } catch (err) {
      const mapped = mapApiError(err as never);
      setSellTarget(null);
      toast.error({
        title: "Couldn't select buyer",
        message: mapped.message,
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Gallery */}
        <View style={styles.galleryWrap}>
          {listing.photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                );
                setActiveImage(idx);
              }}
            >
              {listing.photos.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri: buildMediaUrl(uri) }}
                  style={[
                    styles.galleryImage,
                    listing.status === 'Sold' && styles.galleryDim,
                  ]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
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
                  onPress={() => setMenuOpen(true)}
                  hitSlop={spacing.md}
                  style={styles.iconBtn}
                  testID="listing-detail-menu-button"
                >
                  <MoreVertical
                    size={layout.iconSize.md}
                    color={colors.white}
                  />
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => setIsFavorite(prev => !prev)}
                    hitSlop={spacing.md}
                    style={styles.iconBtn}
                  >
                    <Heart
                      size={layout.iconSize.md}
                      color={isFavorite ? colors.error : colors.white}
                      fill={isFavorite ? colors.error : 'transparent'}
                    />
                  </Pressable>
                  <Pressable hitSlop={spacing.md} style={styles.iconBtn}>
                    <Share2 size={layout.iconSize.md} color={colors.white} />
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {listing.photos.length > 1 ? (
            <View style={styles.dots}>
              {listing.photos.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeImage && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Status banner (seller mode only — buyers don't need to see it) */}
        {isSellerMode ? (
          <StatusBanner
            status={listing.status}
            soldToName={sellTarget?.name}
            soldAtIso={listing.soldAt}
            onSeeReason={() => setRejectionOpen(true)}
          />
        ) : null}

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.price}>{formatINR(listing.price)}</Text>
          <Text style={styles.title}>{listing.title}</Text>

          {!isSellerMode &&
          listing.interestCount &&
          listing.interestCount > 0 ? (
            <View style={styles.interestPill}>
              <Users size={layout.iconSize.sm} color={colors.warning} />
              <Text style={styles.interestPillText}>
                {listing.interestCount}{' '}
                {listing.interestCount === 1 ? 'person' : 'people'} already
                interested
              </Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MapPin size={layout.iconSize.sm} color={colors.textMuted} />
              <Text style={styles.metaText}>{listing.address ?? ''}</Text>
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

          {/* Seller-only: Interested buyers (Live only) */}
          {isSellerMode && listing.status === 'Live' ? (
            <InterestedBuyersSection
              buyers={interestedBuyers}
              onSellTo={handleSellTo}
              onChat={buyer => {
                navigation.navigate('ChatConversation', {
                  listingId: listing._id,
                  counterpartyId: buyer.id,
                  counterpartyName: buyer.name,
                });
              }}
            />
          ) : null}

          {/* Buyer-only: Seller card */}
          {!isSellerMode ? (
            <>
              <Text style={styles.sectionTitle}>Seller</Text>
              <View style={styles.sellerCard}>
                <View style={styles.sellerAvatar}>
                  <Text style={styles.sellerAvatarText}>
                    {(listing.seller?.name ?? 'S').charAt(0)}
                  </Text>
                </View>
                <View style={styles.sellerInfo}>
                  <View style={styles.sellerNameRow}>
                    <Text style={styles.sellerName}>
                      {listing.seller?.name ?? 'Seller'}
                    </Text>
                    {listing.seller?.isVerified ? (
                      <ShieldCheck
                        size={layout.iconSize.sm}
                        color={colors.success}
                      />
                    ) : null}
                  </View>
                  {listing.seller?.memberSince ? (
                    <Text style={styles.sellerMeta}>
                      Member since{' '}
                      {new Date(listing.seller.memberSince).toLocaleDateString(
                        'en-IN',
                        { month: 'short', year: 'numeric' },
                      )}
                    </Text>
                  ) : null}
                  {sellerDistanceKm != null ? (
                    <Text style={styles.sellerMeta}>
                      {sellerDistanceKm} km away
                    </Text>
                  ) : null}
                </View>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky bottom bar — buyer mode only.
          Three states:
            unavailable    → disabled "No longer available" card
            !interest      → single full-width "Buy this product" CTA
            after interest → Chat + Call (phone already revealed)        */}
      {!isSellerMode ? (
        <View style={styles.bottomBar}>
          {isUnavailable ? (
            <View style={styles.unavailableBar}>
              <XCircle size={layout.iconSize.sm} color={colors.textMuted} />
              <Text style={styles.unavailableText}>
                This product is no longer available
              </Text>
            </View>
          ) : !hasExpressedInterest ? (
            <Pressable
              onPress={handleBuyTap}
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
          ) : (
            <>
              <Pressable
                style={styles.chatBtn}
                onPress={handleOpenChat}
                hitSlop={spacing.sm}
              >
                <MessageCircle
                  size={layout.iconSize.md}
                  color={colors.textPrimary}
                />
                <Text style={styles.chatText}>Chat</Text>
              </Pressable>
              {listing.seller?.phone ? (
                <Pressable
                  style={styles.callBtn}
                  onPress={handleCallSeller}
                  hitSlop={spacing.sm}
                >
                  <Phone size={layout.iconSize.md} color={colors.white} />
                  <Text style={styles.callText} numberOfLines={1}>
                    Call · {listing.seller.phone}
                  </Text>
                </Pressable>
              ) : null}
            </>
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
            {listing.status === 'Live' ? (
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

      {/* Sell-to confirm modal with hold-to-confirm */}
      <SellToConfirmModal
        buyer={sellTarget}
        onClose={() => setSellTarget(null)}
        onConfirmed={handleSellConfirmed}
      />

      {/* Buy confirm bottom sheet (buyer mode entry to Express Interest) */}
      <BuyConfirmSheet
        visible={buyConfirmOpen}
        listing={listing}
        confirming={buyConfirming}
        onCancel={() => {
          if (buyConfirming) return;
          setBuyConfirmOpen(false);
        }}
        onConfirm={handleBuyConfirm}
      />
    </SafeAreaView>
  );
};

// ---- Subcomponents ----------------------------------------------------------

interface StatusBannerProps {
  status: ListingStatus;
  soldToName?: string;
  soldAtIso?: string;
  onSeeReason: () => void;
}

const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  soldToName,
  soldAtIso,
  onSeeReason,
}) => {
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
  if (status === 'Sold') {
    return (
      <View style={[styles.statusBanner, styles.statusSold]}>
        <CheckCircle2 size={layout.iconSize.sm} color={colors.textMuted} />
        <Text style={styles.statusText}>
          Sold {soldAtIso ? `on ${formatRelativeShort(soldAtIso)}` : ''}
          {soldToName ? ` to ${soldToName}` : ''}
        </Text>
      </View>
    );
  }
  return null;
};

interface InterestedBuyersSectionProps {
  buyers: InterestedBuyer[];
  onSellTo: (buyer: InterestedBuyer) => void;
  onChat: (buyer: InterestedBuyer) => void;
}

const InterestedBuyersSection: React.FC<InterestedBuyersSectionProps> = ({
  buyers,
  onSellTo,
  onChat,
}) => {
  return (
    <View style={styles.buyersBlock}>
      <Text style={styles.sectionTitle}>
        Interested buyers
        {buyers.length > 0 ? ` · ${buyers.length}` : ''}
      </Text>
      {buyers.length === 0 ? (
        <View style={styles.buyersEmpty}>
          <Text style={styles.buyersEmptyText}>
            No buyers yet — share your listing.
          </Text>
        </View>
      ) : (
        buyers.map(buyer => (
          <View key={buyer.id} style={styles.buyerRow}>
            <View style={styles.buyerAvatar}>
              <Text style={styles.buyerAvatarText}>{buyer.initial}</Text>
            </View>
            <View style={styles.buyerInfo}>
              <View style={styles.buyerNameRow}>
                <Text style={styles.buyerName}>{buyer.name}</Text>
                <Text style={styles.buyerTime}>
                  {formatRelativeShort(buyer.interestedAtIso)}
                </Text>
              </View>
              <Text style={styles.buyerLocation}>
                {buyer.locationLabel} · {buyer.distanceKm} km
              </Text>
              <View style={styles.buyerBtns}>
                {buyer.phone ? (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${buyer.phone}`)}
                    style={styles.buyerChatBtn}
                  >
                    <Text style={styles.buyerChatText}>Call</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => onChat(buyer)}
                  style={styles.buyerChatBtn}
                >
                  <Text style={styles.buyerChatText}>Chat</Text>
                </Pressable>
                <Pressable
                  onPress={() => onSellTo(buyer)}
                  style={styles.buyerSellBtn}
                >
                  <Text style={styles.buyerSellText}>Sell to this buyer</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

interface SellToConfirmModalProps {
  buyer: InterestedBuyer | null;
  onClose: () => void;
  onConfirmed: () => void;
}

const SellToConfirmModal: React.FC<SellToConfirmModalProps> = ({
  buyer,
  onClose,
  onConfirmed,
}) => {
  const visible = !!buyer;
  const progress = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      // Reset progress whenever modal closes / re-opens.
      progress.stopAnimation();
      progress.setValue(0);
      setHolding(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [visible, progress]);

  const startHold = () => {
    setHolding(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_TO_CONFIRM_MS,
      useNativeDriver: false,
    }).start();
    timerRef.current = setTimeout(() => {
      onConfirmed();
    }, HOLD_TO_CONFIRM_MS);
  };

  const cancelHold = () => {
    setHolding(false);
    Animated.timing(progress, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.confirmBackdrop}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>
            Confirm sale to {buyer?.name ?? 'this buyer'}?
          </Text>
          <Text style={styles.confirmBody}>
            Once confirmed, listing ko "Sold" mark kar diya jayega. Doosre
            interested buyers ko notify hoga.
          </Text>
          <View style={styles.confirmHint}>
            <CheckCircle2 size={layout.iconSize.sm} color={colors.primary} />
            <Text style={styles.confirmHintText}>
              Ye action ek slot free karega aapke Wallet mein.
            </Text>
          </View>
          <View style={styles.confirmBtnRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.confirmCancelBtn,
                pressed && styles.cardPressed,
              ]}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPressIn={startHold}
              onPressOut={cancelHold}
              style={styles.confirmHoldBtn}
              accessibilityLabel="Hold to confirm sale"
            >
              <Animated.View
                style={[styles.confirmHoldFill, { width: progressWidth }]}
              />
              <Text style={styles.confirmHoldText}>
                {holding ? 'Hold…' : 'Hold to confirm sale'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface BuyConfirmSheetProps {
  visible: boolean;
  listing: Listing;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const BuyConfirmSheet: React.FC<BuyConfirmSheetProps> = ({
  visible,
  listing,
  confirming,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onCancel} />
      <View style={styles.buySheet}>
        <View style={styles.sheetHandle} />

        <View style={styles.buyRecap}>
          <View
            style={[
              styles.buyRecapThumb,
              { backgroundColor: stubThumbColour(listing._id) },
            ]}
          />
          <View style={styles.buyRecapText}>
            <Text style={styles.buyRecapTitle} numberOfLines={1}>
              {listing.title}
            </Text>
          </View>
          <Text style={styles.buyRecapPrice}>{formatINR(listing.price)}</Text>
        </View>

        <Text style={styles.buySheetHeading}>Confirm interest</Text>

        <Text style={styles.buySheetBody}>
          Seller ko aapki interest dikh jayegi. Aap unhe direct chat ya call kar
          sakte ho. Confirm karte hi aapka phone number unke saath share ho
          jayega.
        </Text>

        <View style={styles.buyPrivacyCard}>
          <Info size={layout.iconSize.sm} color={colors.primary} />
          <Text style={styles.buyPrivacyText}>
            Cash on Delivery only. App se koi payment nahi hoti.
          </Text>
        </View>

        <View style={styles.buyBtnRow}>
          <Pressable
            onPress={onCancel}
            disabled={confirming}
            style={({ pressed }) => [
              styles.buyCancelBtn,
              confirming && styles.buyCancelBtnDisabled,
              pressed && !confirming && styles.cardPressed,
            ]}
          >
            <Text style={styles.buyCancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            disabled={confirming}
            style={({ pressed }) => [
              styles.buyConfirmBtn,
              confirming && styles.buyConfirmBtnLoading,
              pressed && !confirming && styles.cardPressed,
            ]}
          >
            <Text style={styles.buyConfirmText}>
              {confirming ? 'Sending…' : 'Confirm interest'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
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
