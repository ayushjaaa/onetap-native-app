// Real backend notification shape (notification-service). `type` is a free-form
// event key (see notification-service/src/seeds/seedNotificationTemplates.ts),
// not a closed enum — e.g. 'listing.approved', 'kyc.aadhaar_verified',
// 'transaction.completed'. `payload` is whatever the emitting event carried.

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

export interface AppNotification {
  _id: string;
  userId: string;
  channel: 'in_app' | 'sms' | 'push';
  type: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  status: NotificationStatus;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetNotificationsResponseData {
  notifications: AppNotification[];
  total: number;
  limit: number;
  skip: number;
}

export interface GetUnreadCountResponseData {
  count: number;
}

export interface MarkReadResponseData {
  notification: AppNotification;
}

export interface MarkAllReadResponseData {
  modified: number;
}
