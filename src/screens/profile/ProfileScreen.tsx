import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
  Camera,
  ChevronRight,
  IndianRupee,
  KeyRound,
  LogOut,
  MapPin,
  Package,
  ShoppingBag,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/useToast';
import { useImageUpload } from '@/hooks/useImageUpload';
import { logout, setUser } from '@/store/authSlice';
import { resolvePostAdDestination } from '@/navigation/postAdRouter';
import { secureStorage } from '@/services/secureStorage';
import { googleAuth } from '@/services/googleAuth';
import { buildMediaUrl } from '@/utils/media';
import { colors, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

// Toggle to re-enable the Account section's "Forgot password" row — see the
// comment at its render site for why it's off.
const SHOW_FORGOT_PASSWORD_IN_PROFILE = false;

interface RowProps {
  Icon: LucideIcon;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  testID?: string;
}

const Row: React.FC<RowProps> = ({
  Icon,
  label,
  value,
  onPress,
  destructive,
  testID,
}) => {
  const iconColor = destructive ? colors.error : colors.textPrimary;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && styles.rowPressed,
      ]}
    >
      <View style={styles.rowIconWrap}>
        <Icon size={layout.iconSize.md} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, destructive && styles.destructive]}>
          {label}
        </Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {onPress && !destructive ? (
        <ChevronRight size={layout.iconSize.md} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
};

export const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const user = useAppSelector(state => state.auth.user);
  const { can } = usePermission();
  const { pick: pickAvatar, isUploading: isUploadingAvatar } =
    useImageUpload('avatar');

  const handleAvatarPress = async () => {
    const [avatarUrl] = await pickAvatar();
    if (avatarUrl && user) {
      dispatch(setUser({ ...user, avatarUrl }));
      toast.success({ title: 'Profile photo updated' });
    }
  };
  const location = useAppSelector(state => state.location);

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          // Clear Google session so picker reappears next time (no-op for
          // manual login users — googleAuth.signOut swallows errors).
          await googleAuth.signOut();
          await secureStorage.clearToken();
          dispatch(logout());
        },
      },
    ]);
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPasswordPhone');
  };

  const handleUpdateLocation = () => {
    navigation.navigate('UpdateLocation');
  };

  // Seller-row visibility:
  //   - active seller         → show wallet + sales rows
  //   - aadhaar-verified only → show wallet + sales rows AND a resume row
  //                             that resumes onboarding wherever it's
  //                             actually at (not always "buy a package")
  //   - neither               → don't render the section at all
  const showSellerSection =
    Boolean(user?.isSellerApproved) || Boolean(user?.aadhaarVerified);
  const showFinishSellerSetup =
    Boolean(user?.aadhaarVerified) && !user?.isSellerApproved;

  const handleProductWallet = () => navigation.navigate('ProductWallet');
  const handleSalesHistory = () => navigation.navigate('SalesHistory');
  // Reuses the same resume logic as the "Post an Ad" flow instead of
  // hardcoding PackageSelection — a seller who already bought a package
  // (or was rejected) shouldn't be sent back to buy another one.
  const handleFinishSellerSetup = () =>
    navigation.navigate(resolvePostAdDestination(user) as never);
  const handlePurchaseHistory = () => navigation.navigate('PurchaseHistory');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.profileHeader}>
          <Pressable
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar}
            style={styles.avatarWrap}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            <View style={styles.avatar}>
              <Image
                source={
                  buildMediaUrl(user?.avatarUrl)
                    ? { uri: buildMediaUrl(user?.avatarUrl) }
                    : require('@/assets/icons/img.png')
                }
                style={styles.avatarImg}
              />
            </View>
            <View style={styles.avatarEditBadge}>
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Camera size={14} color={colors.white} />
              )}
            </View>
          </Pressable>
          <Text style={styles.name}>{user?.name ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
          {user?.sellerType && user?.sellerDisplayName ? (
            <Text style={styles.sellingAs}>
              Selling as {user.sellerDisplayName}
            </Text>
          ) : null}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role?.toUpperCase() ?? 'USER'}
            </Text>
          </View>
          {can('identity:admin') ? (
            <View style={[styles.roleBadge, styles.adminBadge]}>
              <Text style={styles.roleText}>ADMIN</Text>
            </View>
          ) : null}
        </View>

        {/* Seller section — only renders for sellers (incl. mid-onboarding) */}
        {showSellerSection ? (
          <>
            <Text style={styles.sectionTitle}>Seller</Text>
            <View style={styles.card}>
              <Row
                Icon={Package}
                label="Product Wallet"
                value="Slots, packages, activity"
                onPress={handleProductWallet}
              />
              <View style={styles.divider} />
              <Row
                Icon={IndianRupee}
                label="My Sales"
                value="Completed transactions"
                onPress={handleSalesHistory}
              />
              {showFinishSellerSetup ? (
                <>
                  <View style={styles.divider} />
                  <Row
                    Icon={Zap}
                    label="Finish seller setup"
                    value="Pick a package to start posting"
                    onPress={handleFinishSellerSetup}
                  />
                </>
              ) : null}
            </View>
          </>
        ) : null}

        {/* Activity section — always shown (every user can buy) */}
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.card}>
          <Row
            Icon={ShoppingBag}
            label="My Purchases"
            value="Items you've shown interest in"
            onPress={handlePurchaseHistory}
          />
        </View>

        {/* Account section — hidden for now (not removed): letting an
            already-logged-in user trigger the anonymous phone-OTP
            forgot-password flow on themselves is confusing (it can look like
            nothing happened, or like the wrong account changed, since your
            own session never visibly changes). Re-enable once a proper
            authenticated "Change password" (current-password-required) flow
            replaces this, or once this is deliberately re-scoped. */}
        {SHOW_FORGOT_PASSWORD_IN_PROFILE ? (
          <>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.card}>
              <Row
                Icon={KeyRound}
                label="Forgot password"
                onPress={handleForgotPassword}
              />
            </View>
          </>
        ) : null}

        {/* Location */}
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.card}>
          <Row
            Icon={MapPin}
            label={location.city ?? 'Not set'}
            value={location.state ?? undefined}
            onPress={handleUpdateLocation}
          />
        </View>

        {/* Sign out */}
        <View style={[styles.card, styles.cardSpaced]}>
          <Row
            testID="profile-logout-button"
            Icon={LogOut}
            label="Sign out"
            onPress={handleLogout}
            destructive
          />
        </View>

        <Text style={styles.version}>v1.0.0 · OneTap365</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarWrap: {
    marginBottom: spacing.base,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  name: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  email: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  phone: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sellingAs: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  roleBadge: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: 'rgba(43, 179, 42, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(43, 179, 42, 0.4)',
  },
  adminBadge: {
    marginTop: spacing.xs,
    backgroundColor: 'rgba(179, 43, 43, 0.15)',
    borderColor: 'rgba(179, 43, 43, 0.4)',
  },
  roleText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardSpaced: {
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
  },
  rowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  rowIconWrap: {
    width: layout.iconSize.base,
    height: layout.iconSize.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.base,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  rowValue: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  destructive: {
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + layout.iconSize.base + spacing.base,
  },
  version: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
