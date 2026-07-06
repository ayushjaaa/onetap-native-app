import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  ChevronLeft,
  MapPin,
  X,
} from 'lucide-react-native';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useToast } from '@/hooks/useToast';
import {
  type CategoryPickResult,
  CategoryPickerSheet,
} from '@/components/marketplace';
import { useGetCategoryTreeQuery } from '@/api/categoriesApi';
import { useCreateListingMutation } from '@/api/productsApi';
import { mapApiError } from '@/utils/errorMapper';
import type { ListingCondition } from '@/types';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ListProduct'>;

type Condition = 'new' | 'like_new' | 'used' | 'parts';

interface ConditionOption {
  key: Condition;
  label: string;
}

const CONDITIONS: ConditionOption[] = [
  { key: 'new', label: 'New' },
  { key: 'like_new', label: 'Like new' },
  { key: 'used', label: 'Used' },
  { key: 'parts', label: 'For parts' },
];

// The UI's 4-option condition vocabulary doesn't map 1:1 onto the backend's
// real 5-value enum ('New'|'Like New'|'Good'|'Fair'|'Poor') — there's no
// exact equivalent for "Used" or "For parts". This is a judgment-call
// approximation (confirmed with Ayush as an acceptable interim), not a
// verified product decision: "Used" → "Good" (most used items are still
// functional/serviceable), "For parts" → "Poor" (the closest existing
// "worst condition" bucket). Revisit if the backend's enum changes.
const CONDITION_TO_BACKEND: Record<Condition, ListingCondition> = {
  new: 'New',
  like_new: 'Like New',
  used: 'Good',
  parts: 'Poor',
};

const PHOTO_MIN = 1;
const PHOTO_MAX = 8;
const TITLE_MIN = 5;
const TITLE_MAX = 100;
const DESC_MIN = 20;
const DESC_MAX = 2000;
const PRICE_MIN = 1;
const PRICE_MAX = 9999999;

// Stub: pretend the user has 3 slots free. Real value will come from the
// wallet endpoint (sum of active package slots minus pending+live count).
// Typed as `number` so the screen's "1 slot vs N slots" pluralization
// comparison isn't narrowed away by TS literal inference.
const STUB_SLOTS_AVAILABLE: number = 3;

// Regexes to soft-warn about contact info pasted into the title / desc.
// Backend will hard-flag too, so this is purely a UX nudge.
const PHONE_RE = /(\+?91[-\s]?|0)?[6-9]\d{9}/;
const UPI_RE = /[\w.-]+@(ybl|okhdfcbank|okaxis|okicici|paytm|upi|ibl|airtel)/i;

const containsContact = (text: string): boolean =>
  PHONE_RE.test(text) || UPI_RE.test(text);

interface PhotoSlot {
  /** Pseudo-URI for display. Once real picker lands, this becomes a file URI. */
  uri: string;
  /** Pseudo size in bytes (for the >5MB toast in stub mode). */
  sizeBytes: number;
}

// Solid colour swatches used as stand-ins for real images in v1.
const STUB_COLOURS = [
  '#2BB32A',
  '#3B82F6',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#10B981',
  '#F97316',
];

export const ListAProductScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const user = useAppSelector(state => state.auth.user);
  const location = useAppSelector(state => state.location);

  const { data: categoryTree } = useGetCategoryTreeQuery();
  const [createListing, { isLoading: submitting }] = useCreateListingMutation();

  const [photos, setPhotos] = useState<PhotoSlot[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryPickResult | null>(null);
  const [condition, setCondition] = useState<Condition | null>(null);
  const [priceStr, setPriceStr] = useState('');
  const [negotiable, setNegotiable] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [slotSheetOpen, setSlotSheetOpen] = useState(false);

  // ---- Validation
  const trimmedTitle = title.trim();
  const titleValid =
    trimmedTitle.length >= TITLE_MIN && trimmedTitle.length <= TITLE_MAX;
  const descValid =
    description.length >= DESC_MIN && description.length <= DESC_MAX;
  const photosValid = photos.length >= PHOTO_MIN;
  const categoryValid = !!category;
  const conditionValid = !!condition;
  const priceNum = priceStr.trim() === '' ? NaN : Number(priceStr);
  const priceValid =
    Number.isFinite(priceNum) && priceNum >= PRICE_MIN && priceNum <= PRICE_MAX;
  const hasSlot = STUB_SLOTS_AVAILABLE > 0;

  const canSubmit =
    !submitting &&
    photosValid &&
    titleValid &&
    descValid &&
    categoryValid &&
    conditionValid &&
    priceValid &&
    hasSlot;

  const titleContactWarn = containsContact(trimmedTitle);
  const descContactWarn = containsContact(description);

  const locationLine = useMemo(() => {
    if (!user?.location) return null;
    const loc = user.location;
    const parts = [loc.address, loc.city, loc.pincode].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }, [user]);

  // ---- Handlers
  const handleAddPhoto = () => {
    if (photos.length >= PHOTO_MAX) {
      toast.info({
        title: 'Photo limit reached',
        message: `${PHOTO_MAX} photos max per listing.`,
      });
      return;
    }
    // STUB: when the real image picker integrates we'll show
    // Camera / Gallery / Cancel here. For v1 we drop in a coloured
    // placeholder so the photo grid is fully testable.
    const colour = STUB_COLOURS[photos.length % STUB_COLOURS.length];
    setPhotos(prev => [
      ...prev,
      {
        uri: `stub://${colour}`,
        sizeBytes: 200_000,
      },
    ]);
    toast.info({
      title: 'Stub photo added',
      message:
        'Real camera + gallery picker ships when the image-picker library lands.',
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePickCategory = (result: CategoryPickResult) => {
    setCategory(result);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !category || !condition) return;
    if (location.latitude == null || location.longitude == null) {
      toast.error({
        title: 'Location required',
        message: 'Set your location in your profile before posting.',
      });
      return;
    }

    try {
      await createListing({
        title: trimmedTitle,
        description,
        price: Math.round(priceNum * 100), // rupees entered in UI → paise on the wire
        category: category.categoryId,
        condition: CONDITION_TO_BACKEND[condition],
        lat: location.latitude,
        lng: location.longitude,
        // Photos are dev-only colour-swatch stubs until DN3 (image picker)
        // ships — a "stub://#hex" string is not a real Cloudinary id, so
        // sending it would corrupt real listing data. Omit until Phase 3.
      }).unwrap();

      toast.success({
        title: 'Submitted for review',
        message:
          'Aapka listing admin review mein hai. ~24h mein notify karenge.',
      });

      // Drop the user on the MyAds tab so they can see their submission in
      // the Pending column. MyAds is a Tab inside the Tabs navigator, so we
      // pop back to the tabs first and then hop to the MyAds tab via the
      // parent nav (same pattern Home uses for Search / Post).
      navigation.popToTop();
      navigation.getParent()?.navigate('MyAds' as never);
    } catch (err) {
      const mapped = mapApiError(err as never);
      toast.error({ title: "Couldn't post listing", message: mapped.message });
    }
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
        <Text style={styles.headerTitle}>Post a product</Text>
        <Pressable
          onPress={() => setSlotSheetOpen(true)}
          style={styles.slotChip}
        >
          <Text style={styles.slotChipText}>
            {STUB_SLOTS_AVAILABLE} slot
            {STUB_SLOTS_AVAILABLE === 1 ? '' : 's'}
          </Text>
          <ChevronDown size={layout.iconSize.sm} color={colors.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photos */}
          <SectionLabel text="Photos (1–8) — first is cover" />
          <View style={styles.photoGrid}>
            {Array.from({ length: PHOTO_MAX }).map((_, i) => {
              const photo = photos[i];
              if (photo) {
                return (
                  <View key={i} style={styles.photoTile}>
                    <View
                      style={[
                        styles.photoImg,
                        { backgroundColor: photo.uri.replace('stub://', '') },
                      ]}
                    />
                    {i === 0 ? (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>Cover</Text>
                      </View>
                    ) : null}
                    <Pressable
                      onPress={() => handleRemovePhoto(i)}
                      hitSlop={spacing.sm}
                      style={styles.photoRemoveBtn}
                      accessibilityLabel={`Remove photo ${i + 1}`}
                    >
                      <X size={layout.iconSize.sm} color={colors.white} />
                    </Pressable>
                  </View>
                );
              }
              if (i === photos.length) {
                return (
                  <Pressable
                    key={i}
                    onPress={handleAddPhoto}
                    style={({ pressed }) => [
                      styles.photoTile,
                      styles.photoTileEmpty,
                      pressed && styles.photoTileEmptyPressed,
                    ]}
                  >
                    <Camera size={layout.iconSize.lg} color={colors.primary} />
                  </Pressable>
                );
              }
              return (
                <View
                  key={i}
                  style={[styles.photoTile, styles.photoTileGhost]}
                />
              );
            })}
          </View>
          <Text style={styles.fieldHint}>
            JPG/PNG, max 5MB each. GPS data auto-stripped.
          </Text>

          {/* Title */}
          <SectionLabel text="Title *" spaced />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. iPhone 13 — 128GB, mint condition"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={TITLE_MAX}
            editable={!submitting}
          />
          <View style={styles.helperRow}>
            <Text
              style={[
                styles.fieldHint,
                titleContactWarn && styles.fieldHintWarn,
              ]}
            >
              {titleContactWarn
                ? '⚠ Contact info auto-flagged. Buyers get your phone after they tap Buy.'
                : 'Be specific. Buyers skim titles.'}
            </Text>
            <Text style={styles.counter}>
              {trimmedTitle.length}/{TITLE_MAX}
            </Text>
          </View>

          {/* Description */}
          <SectionLabel text="Description *" spaced />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Condition, accessories, why you're selling…"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.inputMultiline]}
            maxLength={DESC_MAX}
            multiline
            editable={!submitting}
          />
          <View style={styles.helperRow}>
            <Text
              style={[
                styles.fieldHint,
                descContactWarn && styles.fieldHintWarn,
              ]}
            >
              {descContactWarn
                ? '⚠ Contact info auto-flagged in description.'
                : 'Min 20 chars. No phone/UPI — auto-flagged.'}
            </Text>
            <Text style={styles.counter}>
              {description.length}/{DESC_MAX}
            </Text>
          </View>

          {/* Category */}
          <SectionLabel text="Category *" spaced />
          <Pressable
            onPress={() => setPickerOpen(true)}
            disabled={submitting}
            style={({ pressed }) => [
              styles.input,
              styles.categoryField,
              pressed && styles.categoryFieldPressed,
            ]}
          >
            <Text
              style={[
                styles.categoryFieldText,
                !category && styles.categoryFieldPlaceholder,
              ]}
              numberOfLines={1}
            >
              {category ? category.categoryPath.join(' › ') : 'Choose category'}
            </Text>
            <ChevronDown size={layout.iconSize.sm} color={colors.textMuted} />
          </Pressable>

          {/* Condition */}
          <SectionLabel text="Condition *" spaced />
          <View style={styles.segmentRow}>
            {CONDITIONS.map(opt => {
              const isActive = condition === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setCondition(opt.key)}
                  disabled={submitting}
                  style={[styles.segment, isActive && styles.segmentActive]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      isActive && styles.segmentTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Price */}
          <SectionLabel text="Price *" spaced />
          <View style={styles.priceFieldWrap}>
            <Text style={styles.priceCurrency}>₹</Text>
            <TextInput
              value={priceStr}
              onChangeText={setPriceStr}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={[styles.input, styles.priceInput]}
              editable={!submitting}
            />
          </View>
          <Text style={styles.fieldHint}>Cash on Delivery only.</Text>

          {/* Negotiable */}
          <View style={styles.negotiableRow}>
            <Text style={styles.negotiableLabel}>Negotiable?</Text>
            <View style={styles.toggleGroup}>
              <ToggleOption
                label="Yes"
                active={negotiable}
                onPress={() => setNegotiable(true)}
              />
              <ToggleOption
                label="No"
                active={!negotiable}
                onPress={() => setNegotiable(false)}
              />
            </View>
          </View>

          {/* Location */}
          <SectionLabel text="Location" spaced />
          <View style={styles.locationCard}>
            <MapPin size={layout.iconSize.sm} color={colors.primary} />
            <View style={styles.locationTextWrap}>
              <Text style={styles.locationText}>
                {locationLine ?? 'Location not set'}
              </Text>
              <Text style={styles.locationHint}>
                Different jagah ka product? Profile se location update karein.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky bottom bar */}
      <View style={styles.bottomBar}>
        <View style={styles.slotUsageChip}>
          <Text style={styles.slotUsageText}>
            {hasSlot ? 'Uses 1 slot' : 'No slots left'}
          </Text>
        </View>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.primaryBtn,
            !canSubmit && styles.primaryBtnDisabled,
            pressed && canSubmit && styles.primaryBtnPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Post ad</Text>
          )}
        </Pressable>
      </View>

      {/* Sheets */}
      <CategoryPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialCategoryId={category?.categoryId}
        categoryTree={categoryTree}
        onPick={handlePickCategory}
      />

      <SlotChipSheet
        visible={slotSheetOpen}
        onClose={() => setSlotSheetOpen(false)}
        slotsAvailable={STUB_SLOTS_AVAILABLE}
        onViewWallet={() => {
          setSlotSheetOpen(false);
          navigation.navigate('ProductWallet');
        }}
        onBuyMore={() => {
          setSlotSheetOpen(false);
          navigation.navigate('PackageSelection');
        }}
      />
    </SafeAreaView>
  );
};

// ---- Subcomponents ----------------------------------------------------------

const SectionLabel: React.FC<{ text: string; spaced?: boolean }> = ({
  text,
  spaced = false,
}) => (
  <Text style={[styles.sectionLabel, spaced && styles.sectionLabelSpaced]}>
    {text.toUpperCase()}
  </Text>
);

interface ToggleOptionProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

const ToggleOption: React.FC<ToggleOptionProps> = ({
  label,
  active,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.toggleOpt, active && styles.toggleOptActive]}
  >
    <View style={[styles.radio, active && styles.radioActive]}>
      {active ? <View style={styles.radioDot} /> : null}
    </View>
    <Text style={[styles.toggleOptText, active && styles.toggleOptTextActive]}>
      {label}
    </Text>
  </Pressable>
);

interface SlotChipSheetProps {
  visible: boolean;
  onClose: () => void;
  slotsAvailable: number;
  onViewWallet: () => void;
  onBuyMore: () => void;
}

const SlotChipSheet: React.FC<SlotChipSheetProps> = ({
  visible,
  onClose,
  slotsAvailable,
  onViewWallet,
  onBuyMore,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <Pressable style={styles.sheetBackdrop} onPress={onClose} />
    <View style={styles.slotSheet}>
      <View style={styles.handle} />
      <Text style={styles.slotSheetTitle}>Your posting slots</Text>
      <Text style={styles.slotSheetBalance}>
        {slotsAvailable} {slotsAvailable === 1 ? 'slot' : 'slots'} available
      </Text>
      <Text style={styles.slotSheetBody}>
        Har post 1 slot consume karta hai. Slot wapas mil jaata hai jab listing
        sold ho ya admin reject kare.
      </Text>
      {slotsAvailable === 0 ? (
        <View style={styles.slotSheetWarn}>
          <AlertTriangle size={layout.iconSize.sm} color={colors.error} />
          <Text style={styles.slotSheetWarnText}>
            Aapke paas slots khatam ho gaye. Buy more to keep posting.
          </Text>
        </View>
      ) : null}
      <Pressable
        onPress={onBuyMore}
        style={({ pressed }) => [
          styles.slotSheetPrimary,
          pressed && styles.primaryBtnPressed,
        ]}
      >
        <Text style={styles.primaryBtnText}>Buy more slots</Text>
      </Pressable>
      <Pressable onPress={onViewWallet} style={styles.slotSheetLink}>
        <Text style={styles.slotSheetLinkText}>View full wallet</Text>
      </Pressable>
    </View>
  </Modal>
);

// ---- Styles -----------------------------------------------------------------

const PHOTO_GAP = spacing.sm;
const PHOTO_COLS = 4;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
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
  slotChip: {
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
  slotChipText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  sectionLabelSpaced: {
    marginTop: spacing.xl,
  },

  // Photos
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GAP,
  },
  photoTile: {
    width: `${100 / PHOTO_COLS - 2}%`,
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    position: 'relative',
  },
  photoTileEmpty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryAlpha30,
    backgroundColor: colors.primaryAlpha10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTileEmptyPressed: {
    opacity: 0.85,
  },
  photoTileGhost: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    opacity: 0.5,
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'],
    borderRadius: radius.sm,
  },
  coverBadgeText: {
    color: colors.white,
    fontSize: fontSize['2xs'],
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Inputs
  input: {
    minHeight: layout.inputHeight,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: fontSize.base,
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  fieldHint: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
  fieldHintWarn: {
    color: colors.warning,
  },
  counter: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Category field
  categoryField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: layout.inputHeight,
    paddingVertical: 0,
  },
  categoryFieldPressed: {
    opacity: 0.9,
  },
  categoryFieldText: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  categoryFieldPlaceholder: {
    color: colors.textMuted,
  },

  // Condition segmented
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  segment: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.white,
  },

  // Price
  priceFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priceCurrency: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  priceInput: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },

  // Negotiable
  negotiableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  negotiableLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  toggleOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOptActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha10,
  },
  toggleOptText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleOptTextActive: {
    color: colors.primary,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // Location
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  locationHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing['2xs'],
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  slotUsageChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotUsageText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 1,
    height: layout.buttonHeight,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: colors.primaryAlpha30,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    ...typography.button,
    color: colors.white,
  },

  // Slot sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  slotSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: layout.sheetHandleWidth,
    height: layout.sheetHandleHeight,
    borderRadius: radius.xs,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  slotSheetTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  slotSheetBalance: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  slotSheetBody: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.6,
    marginBottom: spacing.lg,
  },
  slotSheetWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    marginBottom: spacing.lg,
  },
  slotSheetWarnText: {
    flex: 1,
    ...typography.caption,
    color: colors.textPrimary,
  },
  slotSheetPrimary: {
    height: layout.buttonHeightMd,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotSheetLink: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  slotSheetLinkText: {
    ...typography.label,
    color: colors.textSecondary,
  },
});
