import type { ListingEditRequest } from '@/types';

/**
 * GET /listings/edit-requests/mine has no listingId filter — it returns every
 * edit request the seller has ever made, across all listings, newest first.
 * Only the most recent one for a given listing matters for status display:
 * once Approved/Rejected, a new request can be submitted, and older history
 * isn't shown anywhere in this app.
 */
export const getLatestEditRequestForListing = (
  editRequests: ListingEditRequest[] | undefined,
  listingId: string,
): ListingEditRequest | undefined =>
  editRequests?.find(r => r.listingId === listingId);
