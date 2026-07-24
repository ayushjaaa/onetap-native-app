export type UserRole = 'user' | 'vendor' | 'seller' | 'admin';

export interface UserLocation {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string; // should  be numern//
  lat?: number;
  lng?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null; // how phone numer can be sting
  // Server-side truth, set only by POST /phone/verify-otp — gates RootNavigator's
  // logged-in-vs-home decision. Never assume true just because `phone` is set.
  phoneVerified?: boolean;
  aadhaarVerified?: boolean;
  isSellerApproved?: boolean;
  // Derived client-side (see `deriveSellerFlags`) from `sellerDisplayName` —
  // distinguishes "picked a seller type" from "finished the profile step".
  sellerProfileSubmitted?: boolean;
  // Derived client-side from `kycStatus === 'rejected'` — a terminal state,
  // not just "not yet approved" (no resubmission path exists).
  sellerRejected?: boolean;
  interests?: string | null;
  location?: UserLocation;
  avatarUrl?: string | null;
  // Capability strings from the backend RBAC system (e.g. 'identity:admin', 'kyc:approve').
  // Only returned by /auth/me — drives show/hide in the app, not `role` (which the backend
  // no longer returns on login and only ever used as a cosmetic signup hint).
  permissions?: string[];
  kycStatus?: 'pending' | 'verified' | 'rejected';
  // Only meaningful when kycStatus === 'rejected' — set by the admin's
  // POST /admin/kyc/:id/reject, cleared on approve.
  kycRejectionReason?: string;
  // Seller-context identity — set only after seller onboarding (setSellerType +
  // submitIndividualSellerProfile). Undefined for buyers and mid-onboarding sellers.
  // Never use this as the primary display name: the same account buys and sells.
  sellerType?: SellerType;
  sellerDisplayName?: string;
}

export interface RegisterRequest {
  name: string;
  phone: string;
  email: string;
  password: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string; // should  be numern//
  lat?: number;
  lng?: number;
}

export interface RegisterResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    user: User;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface MeResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    user: User;
    session?: unknown;
  };
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  location_address?: string;
  location_city?: string;
  location_state?: string;
  location_pincode?: string;
  lat?: number;
  lng?: number;
  interests?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    user: User;
    session?: unknown;
  };
}

export interface SendOtpRequest {
  phone?: string;
}

export interface SendOtpResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    expiresInSeconds: number;
  };
}

export type ResendOtpResponse = SendOtpResponse;

export interface VerifyOtpRequest {
  code: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    phoneVerified: true;
  };
}

export interface ForgotPasswordSendOtpRequest {
  phone: string;
}

export interface ForgotPasswordSendOtpResponse {
  success: boolean;
  statusCode: number;
  message: string;
  // Always 200 regardless of whether the phone is registered (anti-
  // enumeration) — data is empty in production, only populated with
  // code/expiresInSeconds when the backend's EXPOSE_OTP_IN_RESPONSE dev
  // flag is on.
  data: Record<string, unknown>;
}

export interface ForgotPasswordVerifyOtpRequest {
  phone: string;
  code: string;
}

export interface ForgotPasswordVerifyOtpResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    resetToken: string;
  };
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Record<string, never>;
}

export interface GoogleSignInRequest {
  idToken: string;
}

export interface GoogleSignInResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    user: User;
    token: string;
    needsLocation: boolean;
  };
}

export type SellerType = 'individual' | 'wholesale';

export interface SetSellerTypeRequest {
  sellerType: SellerType;
}

export interface SetSellerTypeResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    sellerType: SellerType;
  };
}

export interface SubmitIndividualSellerProfileRequest {
  displayName: string;
  bio?: string;
  photoUrl?: string;
  categories?: string[];
}

export interface SubmitIndividualSellerProfileResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    sellerType: SellerType;
    sellerDisplayName: string;
    sellerBio?: string;
    sellerCategories?: string[];
    avatarUrl?: string;
  };
}
