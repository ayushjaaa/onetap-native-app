export type InterestStatus = 'pending' | 'completed' | 'rejected';

export interface Interest {
  _id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  message?: string;
  status: InterestStatus;
  createdAt: string;
}

export interface GetInterestsParams {
  limit?: number;
  skip?: number;
}

export interface GetInterestsResponseData {
  interests: Interest[];
  total: number;
  limit: number;
  skip: number;
}

export interface Transaction {
  _id: string;
  interestId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number; // paise
  completedAt: string;
  createdAt: string;
}

export type TransactionRole = 'buyer' | 'seller';

export interface GetTransactionsParams {
  role?: TransactionRole;
  limit?: number;
  skip?: number;
}

export interface GetTransactionsResponseData {
  transactions: Transaction[];
  total: number;
  limit: number;
  skip: number;
}

export interface ExpressInterestRequest {
  message?: string;
}

export interface ExpressInterestResponseData {
  interestId: string;
}

export interface SelectBuyerResponseData {
  transactionId: string;
}
