// Stub buyer purchase history. Real backend will return this from
// `GET /me/interests` joined with the interest -> transaction outcome
// (got the deal / lost to another buyer / awaiting seller decision).
//
// Designed to share visual conventions with listingsStub: ids are stable
// strings, prices are in paise, dates are ISO. Will be replaced by an
// RTK Query slice once the listing service exposes the endpoint.

export type PurchaseStatus = 'won' | 'lost' | 'pending';

export interface PurchaseRecord {
  id: string;
  listingId: string; // used for both stubThumbColour + navigating to detail
  listingTitle: string;
  priceInPaise: number;
  sellerId: string;
  sellerName: string;
  status: PurchaseStatus;
  interestedAtIso: string;
  resolvedAtIso?: string; // when the outcome (won / lost) was decided
}

export const STUB_PURCHASES: PurchaseRecord[] = [
  {
    id: 'p1',
    listingId: 'demo-1',
    listingTitle: 'iPhone 13 — 128GB, mint condition',
    priceInPaise: 4_200_000,
    sellerId: 'other_rohit',
    sellerName: 'Rohit S.',
    status: 'won',
    interestedAtIso: '2026-05-17T08:30:00+05:30',
    resolvedAtIso: '2026-05-17T13:15:00+05:30',
  },
  {
    id: 'p2',
    listingId: 'p_activa',
    listingTitle: 'Honda Activa 6G — 2024',
    priceInPaise: 4_500_000,
    sellerId: 'other_seller_a',
    sellerName: 'Manish K.',
    status: 'lost',
    interestedAtIso: '2026-05-14T11:00:00+05:30',
    resolvedAtIso: '2026-05-15T18:20:00+05:30',
  },
  {
    id: 'p3',
    listingId: 'p_sofa',
    listingTitle: 'Modular L-shape sofa set',
    priceInPaise: 2_000_000,
    sellerId: 'other_seller_b',
    sellerName: 'Aisha N.',
    status: 'pending',
    interestedAtIso: '2026-05-17T10:45:00+05:30',
  },
  {
    id: 'p4',
    listingId: 'p_table',
    listingTitle: 'Wooden study table with chair',
    priceInPaise: 350_000,
    sellerId: 'other_seller_c',
    sellerName: 'Karan B.',
    status: 'lost',
    interestedAtIso: '2026-04-30T16:10:00+05:30',
    resolvedAtIso: '2026-05-02T09:00:00+05:30',
  },
  {
    id: 'p5',
    listingId: 'p_textbooks',
    listingTitle: 'B.Tech CS textbook bundle',
    priceInPaise: 80_000,
    sellerId: 'other_seller_d',
    sellerName: 'Sneha P.',
    status: 'won',
    interestedAtIso: '2026-04-25T12:30:00+05:30',
    resolvedAtIso: '2026-04-26T14:15:00+05:30',
  },
];

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the purchases whose outcome resolved in the last 24h. Pending
 * purchases never qualify here — they sit in the "all purchases" list
 * regardless of how recent the original Buy tap was.
 */
export const recentPurchases = (
  purchases: PurchaseRecord[] = STUB_PURCHASES,
  now: number = Date.now(),
): PurchaseRecord[] =>
  purchases.filter(p => {
    if (!p.resolvedAtIso) return false;
    const diff = now - new Date(p.resolvedAtIso).getTime();
    return diff >= 0 && diff <= RECENT_WINDOW_MS;
  });

/**
 * All other purchases, sorted by the more meaningful timestamp (resolved
 * date when known, otherwise the interest date).
 */
export const olderPurchases = (
  purchases: PurchaseRecord[] = STUB_PURCHASES,
  now: number = Date.now(),
): PurchaseRecord[] => {
  const recent = new Set(recentPurchases(purchases, now).map(p => p.id));
  return purchases
    .filter(p => !recent.has(p.id))
    .sort((a, b) => {
      const aT = new Date(a.resolvedAtIso ?? a.interestedAtIso).getTime();
      const bT = new Date(b.resolvedAtIso ?? b.interestedAtIso).getTime();
      return bT - aT;
    });
};
