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
