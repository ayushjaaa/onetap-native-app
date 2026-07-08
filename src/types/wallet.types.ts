export interface WalletPackage {
  id: string;
  name: string;
  postCredits: number;
  priceInPaise: number;
  description: string;
}

export interface GetPackagesResponseData {
  packages: WalletPackage[];
}

export interface InitiatePackagePurchaseRequest {
  packageId: string;
}

export interface InitiatePackagePurchaseResponseData {
  razorpayOrderId: string;
  amount: number; // paise
  currency: 'INR';
  keyId: string;
  package: WalletPackage;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentOrder {
  razorpayOrderId: string;
  amount: number;
  purpose: string;
  purposeRef?: string;
  status: string;
}

export interface VerifyPaymentResponseData {
  verified: true;
  status: 'paid' | 'processing' | 'failed';
  order: VerifyPaymentOrder;
}

export interface Wallet {
  _id: string;
  userId: string;
  postCredits: number;
  biddingBalance: number; // paise
  createdAt: string;
  updatedAt: string;
}

export interface GetWalletResponseData {
  wallet: Wallet;
}

export type WalletTransactionKind =
  | 'topup'
  | 'package_purchase'
  | 'bid_spend'
  | 'bid_refund'
  | 'manual';

export interface WalletTransaction {
  _id: string;
  userId: string;
  type: 'credit' | 'debit';
  kind: WalletTransactionKind;
  amount: number;
  field: 'biddingBalance' | 'postCredits';
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface GetWalletTransactionsParams {
  limit?: number;
  skip?: number;
}

export interface GetWalletTransactionsResponseData {
  transactions: WalletTransaction[];
  total: number;
  limit: number;
  skip: number;
}

export interface PaymentOrderSummary {
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
  purpose: string;
  purposeRef?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetWalletTransactionReceiptResponseData {
  transaction: WalletTransaction;
  paymentOrder: PaymentOrderSummary | null;
}
