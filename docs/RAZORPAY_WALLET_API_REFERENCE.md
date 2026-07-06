# Wallet / Razorpay Payment API — Full Reference

Source of truth: `onetap-backend/microservices/wallet-service/src/`. Every endpoint below was read directly from the controller + route files, not inferred — file:line given so you can re-verify after any backend change.

All requests go through the Gateway at `API_URL` (see `src/config/env.ts`), e.g. `http://10.0.2.2:3001/api/v1` in dev — **check this points at the gateway (:3000) not directly at wallet-service (:3005) once you test against a real deployed environment**, per the existing note in the app's `CLAUDE.md`.

**Auth**: every endpoint except `GET /wallet/packages` requires `Authorization: Bearer <token>` (the token from `secureStorage`, already wired in `baseApi.ts`). The gateway converts this into the internal `X-User-Context` header that `verifyUserContext` checks — the app never touches `X-User-Context` directly.

**Response envelope** (`ApiResponse`, `shared/src/utils/ApiResponse.ts`) — every successful response has this shape:

```ts
{
  success: boolean; // statusCode < 400
  statusCode: number;
  message: string;
  data: T | null; // the actual payload — documented per-endpoint below
}
```

**Error envelope** (`ApiError` → `errorHandler`) on failure:

```ts
{
  success: false;
  statusCode: number;
  message: string;
  errors: any[];         // usually empty []
}
```

**Money unit**: every `amount` field is **paise**, always an integer (₹49 = `4900`). This is a common bug source — never send rupees.

---

## Mock vs real payments — which endpoints are live

Controlled by the backend's `MOCK_PAYMENTS` env var (`wallet-service/.env`):

- `MOCK_PAYMENTS=true` (default in dev/staging) → `POST /wallet/topup` and `POST /wallet/packages/purchase` work and instantly credit the wallet, no Razorpay involved at all. **These two return 403 if `MOCK_PAYMENTS` is not `'true'`.**
- Razorpay-backed endpoints (`.../initiate`, `.../payments/verify`, the webhook) work regardless of `MOCK_PAYMENTS`, but require `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` to be set — the service hard-exits on boot if those are missing and `MOCK_PAYMENTS !== 'true'` (`wallet-service/src/index.ts:9-11`).

You said everything is live/configured on the dev server, so the real Razorpay flow below is what to build against — but the mock endpoints are useful for testing UI states without touching Razorpay at all.

---

## 1. `GET /wallet` — get current wallet

`wallet.controller.ts:11` · route: `wallet.routes.ts:8` · **auth required**

**Request:** no body, no query params.

**Response `data`:**

```ts
{
  wallet: {
    _id: string;
    userId: string;
    postCredits: number; // count of purchased post slots, not money
    biddingBalance: number; // paise
    createdAt: string; // ISO date
    updatedAt: string;
  }
}
```

Note: auto-creates a zeroed wallet on first call (`getOrCreateWallet`) — never 404s for a valid user.

---

## 2. `GET /wallet/packages` — list purchasable packages

`package.controller.ts:9` · route: `package.routes.ts:9` · **no auth required** (public)

**Request:** none.

**Response `data`:**

```ts
{
  packages: Array<{
    id: string; // 'pkg-basic' | 'pkg-standard' | 'pkg-pro'
    name: string; // 'Basic' | 'Standard' | 'Pro'
    postCredits: number; // slots granted
    priceInPaise: number;
    description: string;
  }>;
}
```

**Current real catalog** (`lib/packages.ts` — this is server-side truth, do not hardcode a different one client-side):

| id             | name     | postCredits | priceInPaise | description      |
| -------------- | -------- | ----------- | ------------ | ---------------- |
| `pkg-basic`    | Basic    | 3           | 4900 (₹49)   | 3 listing slots  |
| `pkg-standard` | Standard | 10          | 14900 (₹149) | 10 listing slots |
| `pkg-pro`      | Pro      | 30          | 39900 (₹399) | 30 listing slots |

⚠️ This does **not** match the frontend's current `src/data/packagesCatalog.ts` (`STUB_PACKAGES` uses ids `starter`/`pro`/`business` with different prices/slots entirely). That stub must be replaced by calling this real endpoint — don't hand-sync the values, since this catalog can change server-side without a client release.

---

## 3. `POST /wallet/packages/purchase/initiate` — create a Razorpay order for a package

`payment.controller.ts:54` (`initiatePackagePurchase`) · route: `package.routes.ts:13` · **auth required**

**Request body:**

```ts
{
  packageId: string;
} // must be one of the ids from GET /wallet/packages
```

**Response `data`:**

```ts
{
  razorpayOrderId: string; // pass as order_id into RazorpayCheckout.open()
  amount: number; // paise — pass into RazorpayCheckout.open() too
  currency: 'INR';
  keyId: string; // RAZORPAY_KEY_ID — pass as `key` into RazorpayCheckout.open(). Always read from THIS response, never hardcode client-side.
  package: {
    // full PackageDefinition, echoed back
    id: string;
    name: string;
    postCredits: number;
    priceInPaise: number;
    description: string;
  }
}
```

**Errors:**

- `400` — `packageId` missing
- `404` — `Package '<id>' not found` (bad/stale packageId)
- `500` — `Failed to create payment order` (Razorpay API call itself failed)

**Side effect:** creates a `PaymentOrder` document server-side with `status: 'created'`, `purpose: 'package_purchase'`, `purposeRef: packageId`. This is what `payments/verify` and the webhook later look up — the price is **never** taken from the client, only derived from `PACKAGE_CATALOG[packageId]` server-side, so trust that the amount you display matches what will actually be charged.

---

## 4. `POST /wallet/topup/initiate` — create a Razorpay order for a free-form wallet top-up

`payment.controller.ts:14` (`initiateTopup`) · route: `wallet.routes.ts:10` · **auth required**

Only relevant if you're building a "top up bidding balance" flow (separate from posting packages) — skip if you're only wiring package purchases right now.

**Request body:**

```ts
{
  amount: number;
} // paise. Server-enforced bounds: 1000–1000000 (₹10–₹10,000)
```

**Response `data`:** identical shape to package initiate, minus `package`:

```ts
{
  razorpayOrderId: string;
  amount: number;
  currency: 'INR';
  keyId: string;
}
```

**Errors:**

- `400` — `amount (paise) must be between 1000 and 1000000`

---

## 5. `POST /wallet/payments/verify` — confirm the Razorpay Checkout result

`payment.controller.ts:108` (`verifyPayment`) · route: `wallet.routes.ts:11` · **auth required**

Call this immediately after `RazorpayCheckout.open(...)` resolves successfully, passing through exactly what the SDK gave you.

**Request body:**

```ts
{
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
```

(These three field names come straight from the Razorpay Checkout SDK's success callback — don't rename them.)

**Response `data`:**

```ts
{
  verified: true;
  status: 'processing' | 'paid' | 'failed';   // see note below
  order: {
    razorpayOrderId: string;
    amount: number;
    purpose: 'topup' | 'package_purchase';
    purposeRef?: string;      // packageId, when purpose is package_purchase
    status: 'created' | 'paid' | 'failed';
  }
}
```

**Critical semantic — read carefully:** this endpoint **only checks the cryptographic signature**. It never credits the wallet. `status` in the response is derived as: `order.status === 'created' ? 'processing' : order.status`. That means a perfectly successful, legitimate payment will come back as `'processing'` here almost every time, because the webhook (which does the actual crediting) is an async server-to-server call from Razorpay that lands moments later. **Your UI must treat `'processing'` as "payment confirmed, wallet update pending" — not as failure, and not as instant success either.** This is exactly why `PaymentResultScreen.tsx` already has a third `pending` state, not just success/failure.

**Errors:**

- `400` — missing fields, or `Invalid payment signature` (tampering / wrong values passed)
- `404` — `Payment order not found` (looked up scoped to `razorpayOrderId` + the calling user's `userId` — one user can never verify/probe another user's order)
- `503` — `Payment verification is not configured` (backend missing `RAZORPAY_KEY_SECRET`)

---

## 6. `POST /wallet/webhooks/razorpay` (and legacy alias `/wallet/webhooks/razor_pay`) — server-to-server only

`razorpayWebhook.controller.ts:20` · mounted directly in `index.ts:67-68`, **not** through `wallet.routes.ts`, **no** `verifyUserContext`

**You will never call this from the app.** Documenting it only so you understand where the real wallet credit happens: Razorpay calls this directly with a `payment.captured` event, the backend verifies the `x-razorpay-signature` header via HMAC over the raw body, then atomically: sets `PaymentOrder.status = 'paid'`, increments `Wallet.biddingBalance` (topup) or `Wallet.postCredits` + `auth_users.postSlots` (package), and writes an immutable `WalletTransaction` row. This is idempotent — if the order is already `'paid'`, or already exists as a completed `razorpayPaymentId`, it's a no-op 200.

**Practical implication for your client code:** after `payments/verify` returns `status: 'processing'`, you need to **poll** (e.g. `GET /wallet` or `GET /wallet/transactions`, every few seconds, a handful of times) until you see the credit land, or just tell the user "we'll notify you" and let them check back — don't spin forever. There's no push/socket notification for this today.

---

## 7. `GET /wallet/transactions?limit=&skip=` — paginated ledger

`wallet.controller.ts:81` · route: `wallet.routes.ts:12` · **auth required**

**Request query params (both optional):**

```
limit   number   default 20, hard-capped at 100
skip    number   default 0
```

**Response `data`:**

```ts
{
  transactions: Array<{
    _id: string;
    userId: string;
    type: 'credit' | 'debit';
    kind: 'topup' | 'package_purchase' | 'bid_spend' | 'bid_refund' | 'manual';
    amount: number; // paise if field==='biddingBalance', else a plain slot count
    field: 'biddingBalance' | 'postCredits';
    description: string;
    referenceId?: string; // razorpayPaymentId for real payments, packageId for mock purchases
    createdAt: string;
  }>;
  total: number;
  limit: number;
  skip: number;
}
```

Sorted newest-first. Use this (or `GET /wallet`) as your poll target after a `processing` verify result.

---

## 8. `GET /wallet/transactions/:id/receipt` — single transaction receipt

`wallet.controller.ts:105` · route: `wallet.routes.ts:13` · **auth required**

**Request:** `:id` is the Mongo `_id` of a `WalletTransaction` (must be a valid ObjectId, else `400`).

**Response `data`:**

```ts
{
  transaction: { /* same shape as one item in GET /wallet/transactions */ };
  paymentOrder: {                     // null for mock/manual transactions with no referenceId
    razorpayOrderId: string;
    razorpayPaymentId: string;
    amount: number;
    purpose: 'topup' | 'package_purchase';
    purposeRef?: string;
    status: 'created' | 'paid' | 'failed';
    createdAt: string;
    updatedAt: string;
  } | null;
}
```

Scoped to the requesting user — `404` if the transaction doesn't exist or belongs to someone else.

---

## 9. `POST /wallet/topup` — mock top-up (dev/test only)

`wallet.controller.ts:24` · route: `wallet.routes.ts:9` · **auth required** · **only works if `MOCK_PAYMENTS=true`**, else `403 Payment mock is disabled in this environment`

**Request body:**

```ts
{
  amount: number;
} // paise, must be a positive integer — no min/max bound here (unlike the real initiate endpoint)
```

**Response `data`:**

```ts
{
  biddingBalance: number;
} // paise, the new total after credit
```

Bypasses Razorpay entirely — credits instantly, synchronously, in the same request. Useful for testing wallet-consuming UI without going through Checkout at all, but **do not treat this as a stand-in for the real flow at final integration time** — it never exercises order-create/signature/webhook, and it's disabled in real environments.

---

## 10. `POST /wallet/packages/purchase` — mock package purchase (dev/test only)

`package.controller.ts:17` · route: `package.routes.ts:12` · **auth required** · **only works if `MOCK_PAYMENTS=true`**, else same `403`

**Request body:**

```ts
{
  packageId: string;
}
```

**Response `data`:**

```ts
{
  postCredits: number; // wallet's new total postCredits
  postSlots: number; // auth_users.postSlots after increment — this is the number the "post an ad" flow actually gates on
}
```

Same instant-credit shortcut as #9, for packages instead of topup.

---

## Which endpoints you actually need for "buy a posting package" (the real flow)

In order:

1. `GET /wallet/packages` — populate `PackageSelectionScreen` (replaces `STUB_PACKAGES`)
2. `POST /wallet/packages/purchase/initiate` — on "Buy" tap, get `razorpayOrderId` + `keyId` + `amount`
3. Open Razorpay Checkout SDK client-side with those three values (see prior conversation for the SDK call shape)
4. `POST /wallet/payments/verify` — send back the SDK's `razorpay_order_id`/`razorpay_payment_id`/`razorpay_signature`
5. If `status === 'processing'`: poll `GET /wallet` (watch `postCredits`) or `GET /wallet/transactions` a few times with a short delay, until it flips to reflect the credit, then show success. If it times out after a handful of tries, fall back to the existing `pending` UI state telling the user to check back.

`GET /wallet/transactions/:id/receipt` and the mock endpoints (#9, #10) are not required for the golden path — only for the ledger/receipt screens and local testing respectively.
