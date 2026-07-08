export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export type ListingStatus =
  | 'Draft'
  | 'Pending'
  | 'Live'
  | 'Rejected'
  | 'Sold'
  | 'Expired'
  | 'Deleted';

export type ListingCondition = 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';

export interface Listing {
  _id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number; // paise
  category: string;
  condition: ListingCondition;
  photos: string[]; // Cloudinary public_ids, not full URLs
  location: GeoPoint;
  address?: string;
  status: ListingStatus;
  distanceMetres?: number; // present on feed/trending results only
  adminBoost?: number;
  interestCount?: number;
  trendingScore?: number;
  finalScore?: number; // present on trending results only (trendingScore blended with distance)
  rejectionReason?: string;
  soldAt?: string;
  expiredAt?: string;
  createdAt: string;
  updatedAt: string;
  seller?: ListingSeller; // present on GET /listings/:id only
}

export interface ListingSeller {
  id: string;
  name: string;
  phone?: string; // only present if the seller's phone is verified
  isVerified: boolean;
  memberSince?: string;
}

export interface GetListingResponseData {
  listing: Listing;
}

export interface Interest {
  _id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  message?: string;
  buyerPhone?: string;
  buyerName?: string;
  buyerLocation?: GeoPoint;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
}

export interface GetReceivedInterestsResponseData {
  interests: Interest[];
  total: number;
  limit: number;
  skip: number;
}

export interface ExpressInterestRequest {
  listingId: string;
  message?: string;
}

export interface ExpressInterestResponseData {
  interestId: string;
}

export interface GetFeedParams {
  lat: number;
  lng: number;
  limit?: number;
  cursor?: string;
  category?: string;
  condition?: ListingCondition;
  minPrice?: number;
  maxPrice?: number;
}

export interface GetFeedResponseData {
  listings: Listing[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface GetTrendingParams {
  lat: number;
  lng: number;
  limit?: number;
}

export interface GetTrendingResponseData {
  listings: Listing[];
}

export interface CreateListingRequest {
  title: string;
  description: string;
  price: number; // paise
  category: string;
  condition: ListingCondition;
  lat: number;
  lng: number;
  photos?: string[];
  address?: string;
}

export interface CreateListingResponseData {
  listing: { id: string; status: ListingStatus };
}

export interface MyListingsSummary {
  total: number;
  active: number;
  postSlots: number;
  slotsUsed: number;
  slotsRemaining: number;
  kycStatus: string;
}

export interface GetMyListingsResponseData {
  listings: Listing[];
  summary: MyListingsSummary;
}

export interface DeleteListingResponseData {
  id: string;
  status: ListingStatus;
}
