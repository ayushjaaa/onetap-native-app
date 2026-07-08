export type NotificationChannel = 'in_app' | 'sms' | 'push';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

// Real eventType keys emitted by the backend's outbox pipeline (see
// notification-service seedNotificationTemplates.ts) — not an exhaustive
// closed union, since new template keys can be added server-side without an
// app release, but these are the ones the UI knows how to render distinctly.
export type NotificationType =
  | 'kyc.approved'
  | 'kyc.rejected'
  | 'kyc.aadhaar_verified'
  | 'payment.completed'
  | 'post_slots.granted'
  | 'listing.approved'
  | 'listing.rejected'
  | 'transaction.completed'
  | 'user.suspended'
  | 'user.reinstated'
  | (string & {});

export interface NotificationPayload {
  listingId?: string;
  sellerId?: string;
  buyerId?: string;
  transactionId?: string;
  adminId?: string;
  reason?: string;
  amount?: number;
  postCredits?: number;
  packageId?: string;
  [key: string]: unknown;
}

export interface Notification {
  _id: string;
  userId: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  body: string;
  payload?: NotificationPayload;
  status: NotificationStatus;
  providerRef?: string;
  failureReason?: string;
  readAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetNotificationsParams {
  limit?: number;
  skip?: number;
}

export interface GetNotificationsResponseData {
  notifications: Notification[];
  total: number;
  limit: number;
  skip: number;
}

export interface GetUnreadCountResponseData {
  count: number;
}

export interface MarkAllReadResponseData {
  modified: number;
}

export interface MarkReadResponseData {
  notification: Notification;
}
