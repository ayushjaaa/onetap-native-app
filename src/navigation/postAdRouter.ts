import type { MainStackParamList } from '@/types/navigation.types';

interface SellerStateLike {
  isSellerApproved?: boolean;
  sellerType?: string;
  sellerProfileSubmitted?: boolean;
}

// Resumes onboarding at the next incomplete step instead of always
// restarting at seller-type selection. Order mirrors the backend's actual
// gates: setSellerType/submitIndividualSellerProfile/buy-a-package are all
// ungated; `identity:kyc_verified` (isSellerApproved here) is the only real
// gate, checked at listing-creation time — a package purchase does not
// grant it, so a seller can be "paid up" and still blocked on posting.
//
// Deliberately does NOT branch on a derived "aadhaarVerified" flag here —
// that flag collapses to `Boolean(sellerType)` once isSellerApproved is
// ruled out (see `deriveSellerFlags`), which previously caused an already
// -registered, pending-approval seller (sellerType set AND profile
// submitted) to be routed back to 'SellerType' and asked to register again.
export const resolvePostAdDestination = (
  user: SellerStateLike | null,
): keyof MainStackParamList => {
  if (!user) return 'BecomeSellerIntro';
  if (user.isSellerApproved) return 'ListProduct';
  if (!user.sellerType) return 'BecomeSellerIntro';
  if (!user.sellerProfileSubmitted) return 'IndividualOnboarding';
  // Registered and profile submitted, not yet approved (package bought or
  // not) — can't tell which without a wallet fetch this function doesn't
  // have. Send to the intro/dashboard screen, which is wallet-aware and
  // shows the real current step (buy package / waiting for approval) live.
  return 'BecomeSellerIntro';
};
