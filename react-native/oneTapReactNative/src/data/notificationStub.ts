// Stub in-app notification feed. Real backend will replace with
// `GET /me/notifications?cursor=…` + a socket "notification.created" event
// for live updates. Each notification carries the minimum context needed to
// deep-link back to the source screen.

export type NotificationType =
  | 'purchase_won'
  | 'purchase_lost'
  | 'chat_message'
  | 'listing_approved'
  | 'listing_rejected'
  | 'new_interest'
  | 'package_activated';

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  atIso: string;
  read: boolean;
  /** Used by the deep-link routing — shape depends on type. */
  payload?: {
    listingId?: string;
    counterpartyId?: string;
    counterpartyName?: string;
  };
}

export const STUB_NOTIFICATIONS: NotificationRecord[] = [
  {
    id: 'n1',
    type: 'purchase_won',
    title: 'You got the deal!',
    body: 'iPhone 13 — Pay seller on delivery.',
    atIso: '2026-05-17T13:18:00+05:30',
    read: false,
    payload: { listingId: 'demo-1' },
  },
  {
    id: 'n2',
    type: 'chat_message',
    title: 'Rohit S. replied',
    body: '"Aaj shaam dekhne aa sakta hoon?"',
    atIso: '2026-05-17T10:33:00+05:30',
    read: false,
    payload: {
      listingId: 'l2',
      counterpartyId: 'b_rohit',
      counterpartyName: 'Rohit S.',
    },
  },
  {
    id: 'n3',
    type: 'listing_approved',
    title: 'Listing approved',
    body: 'Honda Activa 6G is now live.',
    atIso: '2026-05-12T11:05:00+05:30',
    read: true,
    payload: { listingId: 'l2' },
  },
  {
    id: 'n4',
    type: 'listing_rejected',
    title: 'Listing rejected — tap to see reason',
    body: 'Mountain bike — slightly used',
    atIso: '2026-05-06T17:45:00+05:30',
    read: true,
    payload: { listingId: 'l5' },
  },
  {
    id: 'n5',
    type: 'new_interest',
    title: 'New buyer interested',
    body: 'Sofa set · Priya M. tapped Buy.',
    atIso: '2026-05-15T14:20:00+05:30',
    read: false,
    payload: {
      listingId: 'l4',
      counterpartyId: 'b_priya',
      counterpartyName: 'Priya M.',
    },
  },
  {
    id: 'n6',
    type: 'package_activated',
    title: 'Package activated',
    body: 'Pro Pack · 5 slots added to your wallet.',
    atIso: '2026-05-14T09:32:00+05:30',
    read: true,
  },
  {
    id: 'n7',
    type: 'purchase_lost',
    title: 'Seller chose another buyer',
    body: 'Honda Activa 6G — no hard feelings.',
    atIso: '2026-05-15T18:20:00+05:30',
    read: true,
    payload: { listingId: 'p_activa' },
  },
];

export const sortNotificationsByRecency = (
  list: NotificationRecord[],
): NotificationRecord[] =>
  [...list].sort(
    (a, b) => new Date(b.atIso).getTime() - new Date(a.atIso).getTime(),
  );

export const countUnread = (list: NotificationRecord[]): number =>
  list.reduce((n, r) => (r.read ? n : n + 1), 0);
