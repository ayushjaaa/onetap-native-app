import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  useGetUnreadCountQuery,
  useLazyGetNotificationsQuery,
} from '@/api/notificationApi';
import { useToast } from '@/hooks/useToast';
import { routeFromNotification } from '@/utils/notificationRouting';
import { NOTIFICATION_POLL_INTERVAL_MS } from '@/config/constants';

/**
 * Approximates push notifications via polling (no FCM/APNs/socket pipeline
 * exists yet — see Phase 5 of the notification plan). Polls unread-count while
 * the app is foregrounded; on an increase, fetches the latest notification and
 * surfaces it as a toast that deep-links via the shared routeFromNotification.
 */
export function useNotificationToasts(): void {
  const toast = useToast();
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setIsActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  const { data: unreadData } = useGetUnreadCountQuery(undefined, {
    pollingInterval: isActive ? NOTIFICATION_POLL_INTERVAL_MS : 0,
  });
  const [fetchNotifications] = useLazyGetNotificationsQuery();

  useEffect(() => {
    if (!unreadData) return;
    const prev = prevCountRef.current;
    prevCountRef.current = unreadData.count;

    // First tick just establishes the baseline — don't toast for whatever was
    // already unread before this session started polling.
    if (prev === null || unreadData.count <= prev) return;

    fetchNotifications(undefined)
      .unwrap()
      .then(result => {
        const newest = result.notifications[0];
        if (!newest) return;
        toast.info({
          title: newest.title,
          message: newest.body,
          onPress: () => routeFromNotification(newest),
        });
      })
      .catch(() => {
        // Best-effort — a missed toast isn't worth surfacing an error for.
      });
    // Safe to include toast/fetchNotifications despite re-running more often than
    // the count actually changes — the prevCountRef guard above no-ops those runs.
  }, [unreadData, toast, fetchNotifications]);
}
