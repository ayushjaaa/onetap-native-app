// Interest lives in product.types.ts (it's the same mkt_interests document
// that GetReceivedInterestsResponseData uses, now enriched with buyerName/
// buyerPhone/buyerLocation) — re-used here rather than duplicated. Not
// re-exported from this file — the barrel (@/types) already exposes it via
// product.types.ts, and re-exporting it here too would make `export *` in
// the barrel ambiguous.
import type { Interest } from './product.types';

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

export interface SelectBuyerResponseData {
  transactionId: string;
}
