// The backend never returns `isSellerApproved`/`aadhaarVerified` fields directly —
// they're derived here from `kycStatus`/`permissions`/`sellerType`, which it does return.
interface SellerStatusSource {
  kycStatus?: string;
  permissions?: string[];
  sellerType?: string;
  sellerDisplayName?: string;
}

export const deriveSellerFlags = (
  source: SellerStatusSource,
): {
  isSellerApproved: boolean;
  aadhaarVerified: boolean;
  sellerProfileSubmitted: boolean;
  sellerRejected: boolean;
} => {
  // Deliberately permission-only — `kycStatus === 'verified'` can be true
  // without the `identity:kyc_verified` role/permission (mock-verify and
  // DigiLocker both set kycStatus but don't grant the role; only the admin
  // approve endpoint does both). Trusting kycStatus alone would show
  // "approved" in the UI while the real listing:create gate still 403s.
  const isSellerApproved = Boolean(
    source.permissions?.includes('identity:kyc_verified'),
  );

  // No standalone "Aadhaar verified" signal exists server-side (the Aadhaar
  // screens are a client-only mock). Having picked a seller type means the
  // user is past that step, so it doubles as the "resume onboarding" signal.
  const aadhaarVerified = isSellerApproved || Boolean(source.sellerType);

  // Set once `submitIndividualSellerProfile` succeeds — distinguishes
  // "picked a seller type" from "finished the profile step", so resume
  // logic can land on the right screen instead of always restarting at
  // seller-type selection.
  const sellerProfileSubmitted = Boolean(source.sellerDisplayName);

  // Only ever set by an admin (`POST /admin/kyc/:id/reject`) — there is no
  // resubmission path once rejected, so this is a terminal state distinct
  // from "still waiting," not just "not yet approved."
  const sellerRejected = source.kycStatus === 'rejected';

  return {
    isSellerApproved,
    aadhaarVerified,
    sellerProfileSubmitted,
    sellerRejected,
  };
};
