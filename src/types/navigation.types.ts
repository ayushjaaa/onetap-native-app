import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { User } from './auth.types';
import type { Listing } from './product.types';
import type { Notification } from './notification.types';

export type AuthStackParamList = {
  Welcome: undefined;
  SignUpName: undefined;
  SignUpEmail: undefined;
  SignUpPassword: undefined;
  SignUpLocation:
    | { fromGoogle?: boolean; user?: User; token?: string }
    | undefined;
  Login: undefined;
  Phone: {
    email: string;
    password?: string;
    user?: User;
    token?: string;
    fromGoogle?: boolean;
    needsLocation?: boolean;
  };
  Otp: {
    email: string;
    password?: string;
    phone: string;
    user?: User;
    token?: string;
    fromGoogle?: boolean;
    needsLocation?: boolean;
  };
  ForgotPasswordPhone: undefined;
  ForgotPasswordOtp: { phone: string };
  ForgotPasswordReset: { resetToken: string };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Post: undefined;
  MyAds: undefined;
  Profile: undefined;
};

export interface CategoryRef {
  id: string;
  name: string;
  iconName?: string;
  iconUrl?: string;
}

export interface ListingRef {
  id: string;
}

export type ComingSoonFeatureKey = 'service' | 'bid' | 'sip';

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  CategoryList: undefined;
  CategoryBrowse: { category: CategoryRef };
  CategoryItems: { category: CategoryRef; subcategoryId?: string };
  // `listing` is an optional pre-fetched Listing passed from screens (like
  // MyAdsScreen) that already have the full object from GET /listings/mine
  // — avoids ListingDetailScreen re-fetching by id, which matters because
  // the public GET /listings/:id 404s for non-Live/Sold statuses (a seller
  // viewing their own Pending/Rejected listing would otherwise 404).
  ListingDetail: { listingId: string; listing?: Listing };
  ComingSoon: { featureKey: ComingSoonFeatureKey };
  BecomeSellerIntro: undefined;
  AadhaarNumber: undefined;
  AadhaarOtp: { aadhaarLast4: string };
  SellerType: undefined;
  IndividualOnboarding: undefined;
  SellerPending: undefined;
  PackageSelection: undefined;
  PaymentResult: { packageId: string };
  ProductWallet: undefined;
  ListProduct: undefined;
  ChatConversation: {
    listingId: string;
    counterpartyId?: string;
    counterpartyName?: string;
  };
  ChatList: undefined;
  PurchaseHistory: undefined;
  SalesHistory: undefined;
  Notifications: undefined;
  // `notification` is passed straight from NotificationCenterScreen's already
  // -fetched list, avoiding a re-fetch by id (there's no GET /notification/:id
  // endpoint on the backend — only list + unread-count + mark-read).
  NotificationDetail: { notificationId: string; notification: Notification };
  ForgotPasswordPhone: undefined;
  ForgotPasswordOtp: { phone: string };
  ForgotPasswordReset: { resetToken: string };
};

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type MainScreenProps<T extends keyof MainStackParamList> =
  NativeStackScreenProps<MainStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList
      extends AuthStackParamList,
        MainStackParamList,
        MainTabParamList {}
  }
}
