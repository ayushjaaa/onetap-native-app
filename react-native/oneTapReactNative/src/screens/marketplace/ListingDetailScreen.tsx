import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
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
import { formatINR } from '@/data/packagesCatalog';
import {
  findStubListing,
  formatRelativeShort,
  type InterestedBuyer,
  isOwnedByCurrentSeller,
  stubThumbColour,
  type StubListing,
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

type Nav = NativeStackNavigationProp<MainStackParamList, 'ListingDetail'>;
type Props = NativeStackScreenProps<MainStackParamList, 'ListingDetail'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const GALLERY_HEIGHT = SCREEN_WIDTH * 0.85;

const HOLD_TO_CONFIRM_MS = 1000;

// ---- Screen -----------------------------------------------------------------

export const ListingDetailScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();

  // TODO: replace with `useGetListingQuery(listingId)` once the listings
  // service ships. For v1 we look up against the in-memory stub set so
  // both MyAds → ListingDetail (seller view) and Home → ListingDetail
  // (buyer view) can be exercised end-to-end with consistent data.
  const baseListing = findStubListing(route.params.listingId);

  const [listing, setListing] = useState<StubListing | null>(
    baseListing ?? null,
  );
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [sellTarget, setSellTarget] = useState<InterestedBuyer | null>(null);
  const [buyConfirmOpen, setBuyConfirmOpen] = useState(false);
  const [buyConfirming, setBuyConfirming] = useState(false);

  // Defensive: unknown listingId renders an inline error frame instead of
  // crashing on undefined access.
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

  const isSellerMode = isOwnedByCurrentSeller(listing);
  const isUnavailable = listing.status === 'sold';

  const handleBuyTap = () => {
    if (isUnavailable || hasExpressedInterest) return;
    setBuyConfirmOpen(true);
  };

  const handleBuyConfirm = async () => {
    if (buyConfirming) return;
    setBuyConfirming(true);
    try {
      // TODO: real POST /listings/:id/interest with an idempotency key.
      // Backend uses an upsert on (listingId, buyerId), so a network retry
      // resolves to the same Interest row instead of spamming the seller.
      await new Promise<void>(resolve => setTimeout(() => resolve(), 600));

      setHasExpressedInterest(true);
      setBuyConfirmOpen(false);
      toast.success({
        title: 'Interest sent',
        message: `${listing.seller.name} ko notify kar diya. Chat ya call ready hai.`,
      });
    } catch {
      toast.error({
        title: "Couldn't send interest",
        message: 'Network issue — phir try karein.',
      });
    } finally {
      setBuyConfirming(false);
    }
  };

  const handleCallSeller = () => {
    // TODO: deep-link to the dialer via Linking.openURL(`tel:${phone}`) once
    // we accept the privacy implication on this screen.
    toast.info({
      title: `Call ${listing.seller.name}`,
      message: listing.seller.phone,
    });
  };

  const handleOpenChat = () => {
    navigation.navigate('ChatConversation', {
      listingId: listing.id,
      counterpartyId: listing.seller.id,
      counterpartyName: listing.seller.name,
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
          onPress: () => {
            toast.success({ title: 'Listing removed' });
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleSellTo = (buyer: InterestedBuyer) => setSellTarget(buyer);

  const handleSellConfirmed = () => {
    if (!sellTarget) return;
    // Optimistic local update — real backend transaction lands later.
    setListing(prev =>
      prev
        ? {
            ...prev,
            status: 'sold',
            soldToName: sellTarget.name,
            soldAtIso: new Date().toISOString(),
          }
        : prev,
    );
    setSellTarget(null);
    toast.success({
      title: 'Sale recorded',
      message: `Sold to ${sellTarget.name}. Slot wapas Wallet mein add ho gaya.`,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Gallery */}
        <View style={styles.galleryWrap}>
          {listing.images.length > 0 ? (
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
              {listing.images.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={[
                    styles.galleryImage,
                    listing.status === 'sold' && styles.galleryDim,
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
                    <Share2
                      size={layout.iconSize.md}
                      color={colors.white}
                    />
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {listing.images.length > 1 ? (
            <View style={styles.dots}>
              {listing.images.map((_, i) => (
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
            viewCount={listing.viewCount}
            soldToName={listing.soldToName}
            soldAtIso={listing.soldAtIso}
            reviewEtaHours={listing.reviewEtaHours}
            onSeeReason={() => setRejectionOpen(true)}
          />
        ) : null}

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.price}>{formatINR(listing.priceInPaise)}</Text>
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
              <Text style={styles.metaText}>{listing.location}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={layout.iconSize.sm} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {formatRelativeShort(listing.postedAtIso)}
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
          {isSellerMode && listing.status === 'live' ? (
            <InterestedBuyersSection
              buyers={listing.interestedBuyers ?? []}
              onSellTo={handleSellTo}
              onChat={buyer => {
                navigation.navigate('ChatConversation', {
                  listingId: listing.id,
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
                    {listing.seller.name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.sellerInfo}>
                  <View style={styles.sellerNameRow}>
                    <Text style={styles.sellerName}>{listing.seller.name}</Text>
                    {listing.seller.isVerified ? (
                      <ShieldCheck
                        size={layout.iconSize.sm}
                        color={colors.success}
                      />
                    ) : null}
                  </View>
                  <Text style={styles.sellerMeta}>
                    {listing.seller.memberSince}
                  </Text>
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
              <ShoppingBag
                size={layout.iconSize.md}
                color={colors.white}
              />
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
            {listing.status === 'live' ? (
              <Pressable
                onPress={handleRemove}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
              >
                <Trash2 size={layout.iconSize.sm} color={colors.error} />
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                  Remove listing
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
            Listings are immutable — rejected listings can't be edited.
            Naya listing post karein (1 slot consume hoga).
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
  status: StubListing['status'];
  viewCount?: number;
  soldToName?: string;
  soldAtIso?: string;
  reviewEtaHours?: number;
  onSeeReason: () => void;
}

const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  viewCount,
  soldToName,
  soldAtIso,
  reviewEtaHours,
  onSeeReason,
}) => {
  if (status === 'pending') {
    return (
      <View style={[styles.statusBanner, styles.statusPending]}>
        <Clock size={layout.iconSize.sm} color={colors.warning} />
        <Text style={styles.statusText}>
          Pending admin review. Live in ~{reviewEtaHours ?? 24}h
        </Text>
      </View>
    );
  }
  if (status === 'live') {
    return (
      <View style={[styles.statusBanner, styles.statusLive]}>
        <CheckCircle2 size={layout.iconSize.sm} color={colors.success} />
        <Text style={styles.statusText}>
          Live · {viewCount ?? 0} {viewCount === 1 ? 'view' : 'views'}
        </Text>
      </View>
    );
  }
  if (status === 'rejected') {
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
  if (status === 'sold') {
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
                  <Text style={styles.buyerSellText}>
                    Sell to this buyer
                  </Text>
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
            <CheckCircle2
              size={layout.iconSize.sm}
              color={colors.primary}
            />
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
  listing: StubListing;
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
              { backgroundColor: stubThumbColour(listing.id) },
            ]}
          />
          <View style={styles.buyRecapText}>
            <Text style={styles.buyRecapTitle} numberOfLines={1}>
              {listing.title}
            </Text>
          </View>
          <Text style={styles.buyRecapPrice}>
            {formatINR(listing.priceInPaise)}
          </Text>
        </View>

        <Text style={styles.buySheetHeading}>Confirm interest</Text>

        <Text style={styles.buySheetBody}>
          Seller ko aapki interest dikh jayegi. Aap unhe direct chat ya
          call kar sakte ho. Confirm karte hi aapka phone number unke
          saath share ho jayega.
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
