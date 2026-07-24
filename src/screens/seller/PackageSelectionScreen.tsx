import React, { useState } from 'react';
import {
  Modal,
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
  Check,
  ChevronLeft,
  HelpCircle,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react-native';
import { formatINR } from '@/data/packagesCatalog';
import { useGetPackagesQuery } from '@/api/walletApi';
import { useGetMyListingsQuery } from '@/api/productsApi';
import type { WalletPackage } from '@/types';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'PackageSelection'>;

const EMPTY_PACKAGES: WalletPackage[] = [];

export const PackageSelectionScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [helpOpen, setHelpOpen] = useState(false);

  const { data: packagesData, isLoading } = useGetPackagesQuery();
  const packages = packagesData?.packages ?? EMPTY_PACKAGES;

  // Real source for "existing slots" — GET /listings/mine's summary, same
  // value MyAdsScreen and ListAProductScreen use. Replaces the hardcoded 0.
  const { data: myListingsData } = useGetMyListingsQuery();
  const existingSlots = myListingsData?.summary.slotsRemaining ?? 0;

  const handleBuy = (pkg: WalletPackage) => {
    navigation.navigate('PaymentResult', { packageId: pkg.id });
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top']}
      testID="package-selection-screen"
    >
      <View style={styles.header}>
        <Pressable
          onPress={navigation.goBack}
          hitSlop={spacing.md}
          style={styles.backBtn}
        >
          <ChevronLeft size={layout.iconSize.lg} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Choose a posting package</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Each package gives you a number of concurrent listing slots. Buy more
          anytime.
        </Text>

        {existingSlots > 0 ? (
          <View style={styles.existingBanner}>
            <Sparkles size={layout.iconSize.sm} color={colors.warning} />
            <Text style={styles.existingBannerText}>
              You have {existingSlots} active slot
              {existingSlots === 1 ? '' : 's'}. Buy more or post a new listing.
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <Text style={styles.intro}>Loading packages…</Text>
        ) : (
          packages.map(pkg => (
            <PackageCard key={pkg.id} pkg={pkg} onBuy={() => handleBuy(pkg)} />
          ))
        )}

        <Pressable
          onPress={() => setHelpOpen(true)}
          hitSlop={spacing.sm}
          style={styles.howLink}
        >
          <HelpCircle size={layout.iconSize.sm} color={colors.primary} />
          <Text style={styles.howLinkText}>How slots work</Text>
        </Pressable>
      </ScrollView>

      {/* "How slots work" bottom sheet */}
      <Modal
        visible={helpOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setHelpOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setHelpOpen(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>How slots work</Text>

          <View style={styles.sheetBlock}>
            <Text style={styles.sheetSubtitle}>What is a slot?</Text>
            <Text style={styles.sheetBody}>
              A slot is one listing that's awaiting review or currently live.
              Your package's slot count is how many listings you can keep active
              at the same time.
            </Text>
          </View>

          <View style={styles.sheetBlock}>
            <Text style={styles.sheetSubtitle}>When does a slot free up?</Text>
            <Text style={styles.sheetBody}>
              • The listing is rejected by an admin{`\n`}• The listing sells
              {`\n`}• You manually remove a live listing
            </Text>
          </View>

          <View style={styles.sheetBlock}>
            <Text style={styles.sheetSubtitle}>Validity</Text>
            <Text style={styles.sheetBody}>
              Slots never expire. You can buy multiple packages and stack your
              slots.
            </Text>
          </View>

          <Pressable
            onPress={() => setHelpOpen(false)}
            style={styles.sheetDoneBtn}
          >
            <Text style={styles.sheetDoneText}>Got it</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

interface PackageCardProps {
  pkg: WalletPackage;
  onBuy: () => void;
}

// The backend catalog has no "popular"/"discounted" concept — that's a pure
// UI merchandising choice. Highlighting the middle tier (pkg-standard) is a
// reasonable default; revisit if the catalog's id naming ever changes.
const isPopular = (pkg: WalletPackage) => pkg.id === 'pkg-standard';

// Backend uses a large sentinel (not literal infinity) for the "unlimited"
// tier's postCredits — see wallet-service/src/lib/packages.ts. Anything at
// or above this reads as unlimited in the UI.
const UNLIMITED_THRESHOLD = 1000;
const isFree = (pkg: WalletPackage) => pkg.priceInPaise <= 0;
const isUnlimited = (pkg: WalletPackage) =>
  pkg.postCredits >= UNLIMITED_THRESHOLD;

const PackageCard: React.FC<PackageCardProps> = ({ pkg, onBuy }) => {
  const popular = isPopular(pkg);
  const free = isFree(pkg);
  const unlimited = isUnlimited(pkg);
  return (
    <View style={[styles.card, popular && styles.cardPopular]}>
      <View
        style={[
          styles.sideBand,
          { backgroundColor: popular ? colors.warning : colors.primary },
        ]}
      />

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName}>{pkg.name}</Text>
          {popular ? (
            <View style={styles.popularPill}>
              <Sparkles size={layout.iconSize.sm} color={colors.warning} />
              <Text style={styles.popularText}>Most popular</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {free ? 'Free' : formatINR(pkg.priceInPaise)}
          </Text>
          {!free ? <Text style={styles.priceUnit}> / pack</Text> : null}
        </View>

        <View style={styles.slotsRow}>
          <LayoutDashboard size={layout.iconSize.sm} color={colors.primary} />
          <Text style={styles.slotsText}>
            {unlimited
              ? 'Unlimited active listings'
              : `${pkg.postCredits} concurrent post ${
                  pkg.postCredits === 1 ? 'slot' : 'slots'
                }`}
          </Text>
        </View>

        <View style={styles.benefits}>
          {(pkg.benefits ?? []).map(benefit => (
            <View key={benefit} style={styles.benefitRow}>
              <Check size={layout.iconSize.sm} color={colors.success} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {free ? (
          <View style={styles.includedPill}>
            <Text style={styles.includedPillText}>
              Included with your account
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={onBuy}
            testID={`package-buy-${pkg.id}`}
            style={({ pressed }) => [
              styles.buyBtn,
              popular && styles.buyBtnPopular,
              pressed && styles.buyBtnPressed,
            ]}
          >
            <Text style={styles.buyBtnText}>Buy this pack</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const SIDE_BAND = 4;

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
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  intro: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  existingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  existingBannerText: {
    flex: 1,
    ...typography.caption,
    color: colors.textPrimary,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardPopular: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  sideBand: {
    width: SIDE_BAND,
  },
  cardBody: {
    flex: 1,
    padding: spacing.base,
    gap: spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  popularPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  popularText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.warning,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  price: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    color: colors.textPrimary,
  },
  priceUnit: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  priceStrike: {
    ...typography.caption,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    marginBottom: spacing.xs,
    marginLeft: spacing.sm,
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  slotsText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  benefits: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  buyBtn: {
    height: layout.buttonHeightMd,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  buyBtnPopular: {
    backgroundColor: colors.warning,
  },
  buyBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buyBtnText: {
    ...typography.button,
    color: colors.white,
  },
  includedPill: {
    height: layout.buttonHeightMd,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  includedPillText: {
    ...typography.button,
    color: colors.textMuted,
  },
  howLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'center',
    paddingVertical: spacing.md,
  },
  howLinkText: {
    ...typography.label,
    color: colors.primary,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: layout.sheetHandleWidth,
    height: layout.sheetHandleHeight,
    borderRadius: layout.sheetHandleHeight / 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  sheetBlock: {
    marginBottom: spacing.lg,
  },
  sheetSubtitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sheetBody: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.6,
  },
  sheetDoneBtn: {
    height: layout.buttonHeightMd,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  sheetDoneText: {
    ...typography.button,
    color: colors.white,
  },
});
