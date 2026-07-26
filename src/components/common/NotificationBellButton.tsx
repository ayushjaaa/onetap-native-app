import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useGetUnreadCountQuery } from '@/api/notificationApi';
import { colors, fontSize, layout, spacing, typography } from '@/theme';

interface Props {
  onPress: () => void;
}

// Isolated on purpose: this reads the same shared RTK Query cache entry that
// useNotificationToasts (mounted once in MainNavigator) already polls every
// 15s — no independent pollingInterval here, so this never starts a second,
// duplicate poll (RTK Query dedupes by endpoint+args regardless of which
// component calls the hook). Kept as its own component (not inline in
// HomeScreen) specifically so that 15s update only re-renders this small
// bell/badge, not HomeScreen's whole tree (categories, trending, banners —
// none of which depend on the unread count).
export const NotificationBellButton: React.FC<Props> = ({ onPress }) => {
  const { data: unreadCountData } = useGetUnreadCountQuery();
  const unreadCount = unreadCountData?.count ?? 0;
  const unreadBadgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <Pressable
      style={styles.bellBtn}
      hitSlop={spacing.sm}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open notifications"
    >
      <Bell size={layout.iconSize.md} color={colors.textPrimary} />
      {unreadCount > 0 ? (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{unreadBadgeLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  bellBtn: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -spacing.xs,
    right: -spacing.xs,
    minWidth: spacing.lg,
    height: spacing.lg,
    borderRadius: spacing.lg / 2,
    paddingHorizontal: spacing.xs / 2,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    ...typography.caption,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs,
    color: colors.white,
    fontWeight: '700',
  },
});
