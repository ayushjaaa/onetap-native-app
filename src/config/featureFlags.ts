// Aadhaar/DigiLocker seller verification is built (AadhaarNumberScreen /
// AadhaarOtpScreen + backend OAuth-redirect flow) but currently unused —
// seller listing is gated by manual admin approval instead (see
// PATCH /auth/me/seller -> POST /auth/seller/individual -> admin
// POST /admin/kyc/:id/approve). Flip this back to `true` to route new
// sellers through the Aadhaar step again; no other code changes needed.
export const AADHAAR_KYC_ENABLED = false;
