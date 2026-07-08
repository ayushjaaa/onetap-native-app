import { navigateFromOutsideScreen } from '@/navigation/navigationRef';
import type { Notification } from '@/types';

// Keyed on the backend's real free-form event `type` strings (see
// notification-service/src/seeds/seedNotificationTemplates.ts) — not the old
// closed NotificationType enum from the stub data. Used by the toast
// tap-handler for direct deep-linking (NotificationCenterScreen's row tap
// instead opens NotificationDetailScreen, which has its own in-screen actions).
export function routeFromNotification(n: Notification): void {
  const listingId = n.payload?.listingId;

  switch (n.type) {
    case 'listing.approved':
    case 'listing.rejected':
      if (typeof listingId === 'string') {
        navigateFromOutsideScreen('ListingDetail', { listingId });
      }
      return;
    case 'transaction.completed':
      if (typeof listingId === 'string') {
        navigateFromOutsideScreen('ListingDetail', { listingId });
      } else {
        navigateFromOutsideScreen('PurchaseHistory', undefined);
      }
      return;
    case 'payment.completed':
    case 'post_slots.granted':
      navigateFromOutsideScreen('ProductWallet', undefined);
      return;
    default:
      // kyc.*/user.* events are account-level with no dedicated deep-link
      // target today — the notification still shows and marks read, it just
      // doesn't navigate anywhere.
      return;
  }
}
