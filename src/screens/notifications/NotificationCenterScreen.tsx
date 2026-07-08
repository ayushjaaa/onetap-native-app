import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { EmptyState } from '@/components/marketplace';
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/api/notificationApi';
import { routeFromNotification } from '@/utils/notificationRouting';
import { formatRelativeShort } from '@/data/listingsStub';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';
import type { AppNotification } from '@/types';
import { TYPE_COLOUR, TYPE_ICON } from './notificationTypeStyles';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Notifications'>;

// ---- Screen -----------------------------------------------------------------

export const NotificationCenterScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { data, isLoading } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const items = data?.notifications ?? [];
  const unreadCount = items.filter(n => n.status !== 'read').length;

  const handleRowTap = (n: AppNotification) => {
    if (n.status !== 'read') markRead(n._id);
    routeFromNotification(n);
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
            onPress={() => markAllRead()}
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
          items.length === 0 && styles.scrollContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loading}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="All quiet for now"
            message="Aapke saare alerts yahaan dikhayi denge."
          />
        ) : (
          items.map(n => (
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
  n: AppNotification;
  onPress: () => void;
}

const NotificationRow: React.FC<RowProps> = ({ n, onPress }) => {
  const isRead = n.status === 'read';
  const Icon = TYPE_ICON(n.type);
  const tint = TYPE_COLOUR(n.type);

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
  loading: {
    marginTop: spacing['3xl'],
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
