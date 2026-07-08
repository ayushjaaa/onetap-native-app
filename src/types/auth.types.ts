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
  aadhaarVerified?: boolean;
  isSellerApproved?: boolean;
  interests?: string | null;
  location?: UserLocation;
  avatarUrl?: string | null;
  // Capability strings from the backend RBAC system (e.g. 'identity:admin', 'kyc:approve').
  // Only returned by /auth/me — drives show/hide in the app, not `role` (which the backend
  // no longer returns on login and only ever used as a cosmetic signup hint).
  permissions?: string[];
}

export interface RegisterRequest {
  name: string;
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
