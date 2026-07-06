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
  distanceMetres?: number; // present on feed results only
  rejectionReason?: string;
  soldAt?: string;
  expiredAt?: string;
  createdAt: string;
  updatedAt: string;
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

export interface SearchListingsParams {
  q?: string;
  limit?: number;
  skip?: number;
}

export interface SearchListingsResponseData {
  listings: Listing[];
  count: number;
}

export interface SearchAutocompleteResponseData {
  suggestions: string[];
}
