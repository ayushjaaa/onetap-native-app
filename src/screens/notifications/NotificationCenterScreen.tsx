import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Package as PackageIcon,
  ShieldAlert,
  ShieldCheck,
  Wallet as WalletIcon,
  XCircle,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { EmptyState } from '@/components/marketplace';
import { ShimmerCard } from '@/components/common/Shimmer';
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/api/notificationApi';
import { formatRelativeShort } from '@/data/listingsStub';
import type { Notification } from '@/types';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Notifications'>;

const EMPTY_NOTIFICATIONS: Notification[] = [];

// ---- Type → icon / colour mapping -------------------------------------------
// Keyed by the real eventType strings the backend's outbox pipeline emits
// (see onetap-backend notification-service seedNotificationTemplates.ts).
// Falls back to a generic bell for any type not listed here, since the
// backend can add new template keys without an app release.

const TYPE_ICON: Record<string, LucideIcon> = {
  'kyc.approved': ShieldCheck,
  'kyc.rejected': ShieldAlert,
  'kyc.aadhaar_verified': ShieldCheck,
  'payment.completed': CreditCard,
  'post_slots.granted': PackageIcon,
  'listing.approved': CheckCircle2,
  'listing.rejected': XCircle,
  'transaction.completed': WalletIcon,
  'user.suspended': ShieldAlert,
  'user.reinstated': ShieldCheck,
};

const TYPE_COLOUR: Record<string, string> = {
  'kyc.approved': colors.success,
  'kyc.rejected': colors.error,
  'kyc.aadhaar_verified': colors.success,
  'payment.completed': colors.primary,
  'post_slots.granted': colors.primary,
  'listing.approved': colors.success,
  'listing.rejected': colors.error,
  'transaction.completed': colors.success,
  'user.suspended': colors.error,
  'user.reinstated': colors.success,
};

// ---- Screen -----------------------------------------------------------------

export const NotificationCenterScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const { data, isLoading } = useGetNotificationsQuery({ limit: 50 });
  const [markAllRead] = useMarkAllNotificationsReadMutation();
  const [markRead] = useMarkNotificationReadMutation();

  const notifications = data?.notifications ?? EMPTY_NOTIFICATIONS;
  const unreadCount = useMemo(
    () => notifications.filter(n => n.status !== 'read').length,
    [notifications],
  );

  const handleMarkAllRead = () => {
    void markAllRead();
  };

  const handleRowTap = (n: Notification) => {
    if (n.status !== 'read') void markRead(n._id);
    routeFromNotification(n, navigation);
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
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable
            onPress={handleMarkAllRead}
            hitSlop={spacing.sm}
            style={styles.markAllBtn}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          notifications.length === 0 && styles.scrollContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <>
            <ShimmerCard />
            <ShimmerCard />
          </>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="All quiet for now"
            message="Aapke saare alerts yahaan dikhayi denge."
          />
        ) : (
          notifications.map(n => (
            <NotificationRow
              key={n._id}
              n={n}
              onPress={() => handleRowTap(n)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ---- Row --------------------------------------------------------------------

interface RowProps {
  n: Notification;
  onPress: () => void;
}

const NotificationRow: React.FC<RowProps> = ({ n, onPress }) => {
  const Icon = TYPE_ICON[n.type] ?? Bell;
  const tint = TYPE_COLOUR[n.type] ?? colors.textMuted;
  const isRead = n.status === 'read';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isRead && styles.rowRead,
        pressed && styles.rowPressed,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: hexToAlpha(tint, 0.15) },
          { borderColor: hexToAlpha(tint, 0.35) },
        ]}
      >
        <Icon size={layout.iconSize.base} color={tint} />
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTopLine}>
          <Text
            style={[styles.rowTitle, !isRead && styles.rowTitleUnread]}
            numberOfLines={2}
          >
            {n.title}
          </Text>
          <Text style={[styles.rowTime, !isRead && styles.rowTimeUnread]}>
            {formatRelativeShort(n.createdAt)}
          </Text>
        </View>
        {n.body ? (
          <Text style={styles.rowSnippet} numberOfLines={2}>
            {n.body}
          </Text>
        ) : null}
      </View>

      {!isRead ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
};

// ---- Routing -----------------------------------------------------------------
// Every notification opens its own detail view first (title/body/timestamp +
// a type-specific "view listing/wallet/transaction" action inside), rather
// than jumping straight to another screen — so types with nowhere else to
// deep-link to (kyc.*, user.suspended, user.reinstated) still show something
// on tap instead of doing nothing.

function routeFromNotification(n: Notification, navigation: Nav): void {
  navigation.navigate('NotificationDetail', {
    notificationId: n._id,
    notification: n,
  });
}

// ---- Helpers ----------------------------------------------------------------

/**
 * Convert a #RRGGBB or rgb() colour to an rgba(…) string with the supplied
 * alpha. Falls back to the input when the format doesn't match so we never
 * crash on a theme value we don't recognise.
 */
function hexToAlpha(value: string, alpha: number): string {
  if (value.startsWith('#') && (value.length === 7 || value.length === 4)) {
    const hex =
      value.length === 4
        ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
        : value;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (value.startsWith('rgba(')) return value; // already alpha
  if (value.startsWith('rgb(')) {
    return value.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  return value;
}

// ---- Styles -----------------------------------------------------------------

const ICON_CIRCLE = 40;

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
  markAllBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  markAllText: {
    ...typography.label,
    color: colors.primary,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.sm,
  },
  scrollContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryAlpha15,
  },
  rowRead: {
    borderColor: colors.borderSubtle,
  },
  rowPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.997 }],
  },
  iconCircle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowTitle: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  rowTitleUnread: {
    fontWeight: '800',
  },
  rowTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rowTimeUnread: {
    color: colors.primary,
    fontWeight: '700',
  },
  rowSnippet: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing['2xs'],
    lineHeight: fontSize.sm * 1.5,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
});
