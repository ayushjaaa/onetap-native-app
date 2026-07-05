# API Integration Progress

**Companion doc:** [API_INTEGRATION_PLAN.md](./API_INTEGRATION_PLAN.md) — full detail, endpoint mappings, and rationale for every row below lives there. This file is only the status tracker; update it in the same pass as any code change, same convention the backend repo uses for its `ENDPOINTS_TALLY.md`.

**How to read this:** each row links to its phase in the plan doc. Update **Status** as work lands — don't mark something done until it's been exercised against the real running backend (see the backend repo's own verification convention: unit + integration tests aren't enough on their own, hit the live gateway too).

**Legend:** ⬜ not started · 🚧 in progress · ✅ done, verified against live backend · ⛔ blocked (see linked decision in Phase 0)

---

## Phase 0 — Decisions ([plan](./API_INTEGRATION_PLAN.md#phase-0-decisions-needed-before-wiring-read-this-first))

| # | Decision | Status | Notes |
|---|---|---|---|
| DN1 | Forgot-password: redesign to email, or build phone-based reset on backend? | ⬜ | Blocks Phase 9 |
| DN2 | Aadhaar KYC: interim `mock-verify` swap, or wait for D6 (backend)? | ⬜ | Blocks Phase 8 |
| DN3 | Image-picker library choice | ⬜ | Blocks Phase 3 (and the photo parts of Phase 2) |
| DN4 | Google Sign-In dead route — fix now or leave deferred? | ⬜ (recommend: leave deferred) | Not blocking anything currently — button is UI-disabled anyway |
| DN5 | Chat — do not start | ❌ N/A | Backend Phase 5 not built; revisit only after backend chat decision lands |

---

## Phase 1 — Real phone OTP ([plan](./API_INTEGRATION_PLAN.md#phase-1-real-phone-otp-auth-flow-foundation))

| Item | Status | Notes |
|---|---|---|
| `authApi.ts`: `sendOtp` → real `POST /auth/phone/send-otp` | ⬜ | |
| `authApi.ts`: `verifyOtp` → real `POST /auth/phone/verify-otp` | ⬜ | |
| `authApi.ts`: add `resendOtp` → real `POST /auth/phone/resend-otp` | ⬜ | Not previously exposed as a hook at all |
| `SendOtpResponse`/`VerifyOtpResponse` types updated to real shape | ⬜ | `{ expiresInSeconds, code? }` / `{ phoneVerified: true }` |
| Verified against live backend (not just typecheck) | ⬜ | |

---

## Phase 2 — Seller onboarding ([plan](./API_INTEGRATION_PLAN.md#phase-2-seller-onboarding-backend-ready-screens-are-100-settimeout-stubs))

| Item | Status | Notes |
|---|---|---|
| `userApi.ts`: `setSellerType` → `PATCH /auth/me/seller` | ⬜ | |
| `SellerTypeScreen.tsx` wired to real mutation | ⬜ | |
| `userApi.ts`: `submitIndividualProfile` → `POST /auth/seller/individual` | ⬜ | |
| `IndividualOnboardingScreen.tsx` text fields wired (photo excluded — see Phase 3) | ⬜ | Must fire *after* `setSellerType` succeeds (backend 422s otherwise) |
| `SUGGESTED_CATEGORIES` swapped for real `/categories/top` | ⬜ | Piggyback on Phase 4's endpoint once that lands |
| `User` type drift reconciled (`isSellerApproved`/`aadhaarVerified` derivation) | ⬜ | See Plan doc's cross-cutting note — affects `postAdRouter.ts` routing correctness |
| Verified against live backend | ⬜ | |

---

## Phase 3 — Image upload infrastructure ([plan](./API_INTEGRATION_PLAN.md#phase-3-image-upload-infrastructure-new-native-capability)) — ⛔ blocked on DN3

| Item | Status | Notes |
|---|---|---|
| Picker library installed + native-linked | ⬜ | |
| Shared upload helper (`src/services/imageUpload.ts`) | ⬜ | One helper, parameterized by upload-token endpoint |
| `IndividualOnboardingScreen.tsx` photo wired | ⬜ | Feeds `photoUrl` into Phase 2's submit call |
| `ListAProductScreen.tsx` photos wired | ⬜ | Feeds `photos[]` into Phase 5's create-listing call |
| Verified against live backend (real Cloudinary round trip) | ⬜ | |

---

## Phase 4 — Categories ([plan](./API_INTEGRATION_PLAN.md#phase-4-categories-backend-ready-currently-duplicated-3-ways-on-the-client))

| Item | Status | Notes |
|---|---|---|
| `getCategoryTree` / `getTopCategories` queries added | ⬜ | |
| `HomeScreen.tsx` category grid wired | ⬜ | |
| `CategoryListScreen.tsx` wired | ⬜ | |
| `CategoryBrowseScreen.tsx` subcategories wired (real per-category children) | ⬜ | Fixes the "same 4 subcategories regardless of category" bug |
| `src/data/categoryTree.ts` stub removed once nothing imports it | ⬜ | Confirm zero remaining references before deleting |
| Verified against live backend | ⬜ | |

---

## Phase 5 — Marketplace core ([plan](./API_INTEGRATION_PLAN.md#phase-5-marketplace-core-backend-fully-built-screens-fully-stub))

| Item | Status | Notes |
|---|---|---|
| `productsApi.ts`: feed query (`GET /listings/feed`) | ⬜ | |
| `HomeScreen.tsx` live listings wired | ⬜ | |
| `CategoryBrowseScreen.tsx` / `CategoryItemsScreen.tsx` feed wired | ⬜ | |
| `productsApi.ts`: search + autocomplete queries | ⬜ | |
| `SearchScreen.tsx` results wired | ⬜ | Trending stays stub — backend endpoint doesn't exist yet |
| `productsApi.ts`: `getListingById` (`GET /listings/:id`) | ⬜ | |
| `ListingDetailScreen.tsx` fetch wired | ⬜ | |
| `productsApi.ts`: `expressInterest` mutation | ⬜ | |
| `ListingDetailScreen.tsx` "buy this product" wired | ⬜ | |
| `productsApi.ts`: favorite toggle mutations | ⬜ | |
| `ListingDetailScreen.tsx` favorite wired | ⬜ | |
| `productsApi.ts`: `selectBuyer` mutation | ⬜ | Needs `interestId`, not just `buyerId` — depends on `GET /interests/received` wiring below |
| `ListingDetailScreen.tsx` "sell to buyer" wired | ⬜ | |
| `productsApi.ts`: `deleteListing` mutation | ⬜ | Shared by `ListingDetailScreen` and `MyAdsScreen` |
| `ListingDetailScreen.tsx` / `MyAdsScreen.tsx` remove wired | ⬜ | |
| `productsApi.ts`: `getMyListings` (`GET /listings/mine`) | ⬜ | Also the real source for `slotsRemaining` used in Phases 2, 5, 6 |
| `MyAdsScreen.tsx` list wired | ⬜ | |
| `productsApi.ts`: `createListing` mutation | ⬜ | |
| `ListAProductScreen.tsx` wired (minus photos, see Phase 3) | ⬜ | |
| `productsApi.ts`: `getMyInterests` (`GET /interests/mine`) + `getMyTransactions` (`GET /transactions/mine`) | ⬜ | |
| `BuyerPurchaseHistoryScreen.tsx` wired | ⬜ | won/lost/pending status derived client-side |
| `SellerSalesHistoryScreen.tsx` wired | ⬜ | "view receipt" — confirm a real cross-link exists before promising it in UI; may stay a stub (see Plan doc) |
| New "My Favorites" screen (optional scope) | ⬜ | `GET /me/favorites` has no screen today — not required, flagged only |
| Verified against live backend | ⬜ | |

---

## Phase 6 — Wallet & packages ([plan](./API_INTEGRATION_PLAN.md#phase-6-wallet-packages-backend-fully-built-screens-fully-stub))

| Item | Status | Notes |
|---|---|---|
| `walletApi.ts`: `getPackages` (`GET /wallet/packages`) | ⬜ | |
| `PackageSelectionScreen.tsx` catalog wired | ⬜ | UI must accept real ids/names/prices — do not hardcode `starter`/`pro`/`business` anywhere after this lands |
| `PackageSelectionScreen.tsx` existing-slots banner wired | ⬜ | Sourced from Phase 5's `getMyListings` summary |
| Razorpay Checkout SDK decision + install (if going real-payment route) | ⬜ | Separate sub-decision from DN3 but same category of gap — see Plan doc |
| `walletApi.ts`: `initiatePackagePurchase` / mock `purchasePackage` | ⬜ | |
| `walletApi.ts`: `verifyPayment` (`POST /wallet/payments/verify`) | ⬜ | |
| `PaymentResultScreen.tsx` wired | ⬜ | |
| `walletApi.ts`: `getTransactions` (`GET /wallet/transactions`) | ⬜ | |
| `ProductWalletScreen.tsx` ledger wired | ⬜ | "Active packages" section may need redesign — no backend expiry concept exists, see Plan doc |
| Verified against live backend | ⬜ | |

---

## Phase 7 — Notifications ([plan](./API_INTEGRATION_PLAN.md#phase-7-notifications-backend-fully-built-screen-fully-stub))

| Item | Status | Notes |
|---|---|---|
| `notificationApi.ts` created (`GET /notification`, `/unread-count`, `PATCH /:id/read`, `PATCH /mark-all-read`) | ⬜ | |
| `NotificationCenterScreen.tsx` wired | ⬜ | Deep-link routing keyed off real event-derived `type` strings, not the stub's `NotificationType` enum |
| Unread-count bell dot wired (`HomeScreen.tsx` + anywhere else it renders) | ⬜ | |
| Verified against live backend | ⬜ | |

---

## Phase 8 — Aadhaar KYC ([plan](./API_INTEGRATION_PLAN.md#phase-8-aadhaar-kyc-blocked-on-dn2)) — ⛔ blocked on DN2

| Item | Status | Notes |
|---|---|---|
| DN2 resolved | ⬜ | |
| `AadhaarNumberScreen.tsx` wired (interim or real, per DN2 outcome) | ⬜ | |
| `AadhaarOtpScreen.tsx` handled (skipped, repurposed, or kept — per DN2 outcome) | ⬜ | |
| Verified against live backend | ⬜ | |

---

## Phase 9 — Forgot password ([plan](./API_INTEGRATION_PLAN.md#phase-9-forgot-password-blocked-on-dn1)) — ⛔ blocked on DN1

| Item | Status | Notes |
|---|---|---|
| DN1 resolved | ⬜ | |
| `ForgotPasswordPhoneScreen.tsx` redesigned/wired | ⬜ | |
| `ForgotPasswordOtpScreen.tsx` redesigned/wired | ⬜ | |
| `ForgotPasswordResetScreen.tsx` wired | ⬜ | |
| Verified against live backend | ⬜ | |

---

## Phase 10 — Chat ([plan](./API_INTEGRATION_PLAN.md#phase-10-chat-not-started-do-not-attempt)) — ❌ do not start

No tracker rows — nothing to track until backend Phase 5 exists. Re-visit this file once that changes.

---

## Cross-cutting cleanup (not phase-specific — see [Plan doc](./API_INTEGRATION_PLAN.md#cross-cutting-notes-apply-across-every-phase))

| Item | Status | Notes |
|---|---|---|
| `User` type (`src/types/auth.types.ts`) reconciled with real `/auth/me` shape | ⬜ | Affects `postAdRouter.ts` correctness — see Phase 2 |
| One RTK Query API file per backend service, not ad hoc | ⬜ | Ongoing discipline check across all phases |
