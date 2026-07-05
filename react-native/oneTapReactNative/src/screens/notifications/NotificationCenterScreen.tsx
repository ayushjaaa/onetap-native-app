import React, { useMemo, useState } from 'react';
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
  Bell,
  CheckCircle2,
  ChevronLeft,
  Heart,
  MessageCircle,
  Package as PackageIcon,
  XCircle,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { EmptyState } from '@/components/marketplace';
import {
  countUnread,
  type NotificationRecord,
  type NotificationType,
  sortNotificationsByRecency,
  STUB_NOTIFICATIONS,
} from '@/data/notificationStub';
import { formatRelativeShort } from '@/data/listingsStub';
import {
  colors,
  fontSize,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Notifications'>;

// ---- Type → icon / colour mapping -------------------------------------------

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  purchase_won: CheckCircle2,
  purchase_lost: XCircle,
  chat_message: MessageCircle,
  listing_approved: CheckCircle2,
  listing_rejected: XCircle,
  new_interest: Heart,
  package_activated: PackageIcon,
};

const TYPE_COLOUR: Record<NotificationType, string> = {
  purchase_won: colors.success,
  purchase_lost: colors.textMuted,
  chat_message: colors.info,
  listing_approved: colors.success,
  listing_rejected: colors.error,
  new_interest: colors.error,
  package_activated: colors.primary,
};

// ---- Screen -----------------------------------------------------------------

export const NotificationCenterScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<NotificationRecord[]>(STUB_NOTIFICATIONS);

  const ordered = useMemo(() => sortNotificationsByRecency(items), [items]);
  const unreadCount = useMemo(() => countUnread(items), [items]);

  const markRead = (id: string) => {
    setItems(prev =>
      prev.map(r => (r.id === id ? { ...r, read: true } : r)),
    );
  };

  const markAllRead = () => {
    setItems(prev => prev.map(r => ({ ...r, read: true })));
  };

  const handleRowTap = (n: NotificationRecord) => {
    if (!n.read) markRead(n.id);
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
            onPress={markAllRead}
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
          ordered.length === 0 && styles.scrollContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {ordered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="All quiet for now"
            message="Aapke saare alerts yahaan dikhayi denge."
          />
        ) : (
          ordered.map(n => (
            <NotificationRow
              key={n.id}
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
  n: NotificationRecord;
  onPress: () => void;
}

const NotificationRow: React.FC<RowProps> = ({ n, onPress }) => {
  const Icon = TYPE_ICON[n.type];
  const tint = TYPE_COLOUR[n.type];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        n.read && styles.rowRead,
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
            style={[styles.rowTitle, !n.read && styles.rowTitleUnread]}
            numberOfLines={2}
          >
            {n.title}
          </Text>
          <Text
            style={[styles.rowTime, !n.read && styles.rowTimeUnread]}
          >
            {formatRelativeShort(n.atIso)}
          </Text>
        </View>
        {n.body ? (
          <Text style={styles.rowSnippet} numberOfLines={2}>
            {n.body}
          </Text>
        ) : null}
      </View>

      {!n.read ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
};

// ---- Deep-link routing ------------------------------------------------------

function routeFromNotification(
  n: NotificationRecord,
  navigation: Nav,
): void {
  switch (n.type) {
    case 'purchase_won':
    case 'purchase_lost':
      navigation.navigate('PurchaseHistory');
      return;
    case 'chat_message':
      if (n.payload?.listingId) {
        navigation.navigate('ChatConversation', {
          listingId: n.payload.listingId,
          counterpartyId: n.payload.counterpartyId,
          counterpartyName: n.payload.counterpartyName,
        });
      }
      return;
    case 'listing_approved':
    case 'listing_rejected':
      if (n.payload?.listingId) {
        navigation.navigate('ListingDetail', {
          listingId: n.payload.listingId,
        });
      }
      return;
    case 'new_interest':
      if (n.payload?.listingId) {
        // Seller-mode ListingDetail will surface the interested-buyers
        // section; jumping straight to MyAds would lose the listing context.
        navigation.navigate('ListingDetail', {
          listingId: n.payload.listingId,
        });
      }
      return;
    case 'package_activated':
      navigation.navigate('ProductWallet');
      return;
    default:
      return;
  }
}

// ---- Helpers ----------------------------------------------------------------

/**
 * Convert a #RRGGBB or rgb() colour to an rgba(…) string with the supplied
 * alpha. Falls back to the input when the format doesn't match so we never
 * crash on a theme value we don't recognise.
 */
function hexToAlpha(value: string, alpha: number): string {
  if (value.startsWith('#') && (value.length === 7 || value.length === 4)) {
    const hex = value.length === 4
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
