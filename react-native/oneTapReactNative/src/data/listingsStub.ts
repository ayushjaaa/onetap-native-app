// Stub listings used by MyAds + ListingDetail until the listing service
// exposes real endpoints. Mirrors the eventual shape so the swap to
// `GET /listings/:id` and `GET /me/listings` is a one-liner per consumer.

export type ListingStatus = 'pending' | 'live' | 'rejected' | 'sold';

export interface InterestedBuyer {
  id: string;
  name: string;
  initial: string;
  locationLabel: string;
  distanceKm: number;
  interestedAtIso: string;
  closed?: boolean;
}

export interface StubSellerProfile {
  id: string;
  name: string;
  memberSince: string;
  isVerified: boolean;
  phone: string;
}

export interface StubListing {
  id: string;
  title: string;
  description: string;
  priceInPaise: number;
  images: string[];
  location: string;
  postedAtIso: string;
  category: string;
  condition: string;
  status: ListingStatus;
  // Stats
  viewCount?: number;
  interestCount?: number;
  // Pending
  reviewEtaHours?: number;
  // Rejected
  rejectionReason?: string;
  // Sold
  soldToName?: string;
  soldAtIso?: string;
  // Owner
  seller: StubSellerProfile;
  interestedBuyers?: InterestedBuyer[];
}

// The seller persona we use to gate seller-mode rendering.
// Real check: `listing.seller.id === user.id`.
export const STUB_CURRENT_SELLER_ID = 'self';

const SELF: StubSellerProfile = {
  id: STUB_CURRENT_SELLER_ID,
  name: 'You',
  memberSince: 'Member since Jan 2026',
  isVerified: true,
  phone: '+91 98765 12345',
};

const OTHER_SELLER: StubSellerProfile = {
  id: 'other_rohit',
  name: 'Rohit S.',
  memberSince: 'Member since Jan 2026',
  isVerified: true,
  phone: '+91 ••••• ••012',
};

export const STUB_LISTINGS: StubListing[] = [
  // ---- Owned listings (match the MyAds stubs) ----
  {
    id: 'l1',
    title: 'iPhone 13 — 128GB, mint condition',
    description:
      'Selling my iPhone 13 (Midnight, 128GB). Used for ~14 months, always in case + screen protector. Battery health 91%. Includes original charger and box. No scratches, fully functional.',
    priceInPaise: 4_200_000,
    images: [],
    location: 'Andheri West, Mumbai',
    postedAtIso: '2026-05-17',
    category: 'Electronics › Mobiles',
    condition: 'Like new',
    status: 'pending',
    reviewEtaHours: 24,
    seller: SELF,
  },
  {
    id: 'l2',
    title: 'Honda Activa 6G — 2024 model',
    description:
      '2024 Honda Activa 6G in showroom condition. Single owner, full service history. 4,500 km driven. All papers clean. Front + rear new tyres.',
    priceInPaise: 4_500_000,
    images: [],
    location: 'Andheri West, Mumbai',
    postedAtIso: '2026-05-12',
    category: 'Vehicles › Scooters',
    condition: 'Like new',
    status: 'live',
    viewCount: 124,
    interestCount: 3,
    seller: SELF,
    interestedBuyers: [
      {
        id: 'b_rohit',
        name: 'Rohit S.',
        initial: 'R',
        locationLabel: 'Andheri',
        distanceKm: 5,
        interestedAtIso: '2026-05-17',
      },
      {
        id: 'b_priya',
        name: 'Priya M.',
        initial: 'P',
        locationLabel: 'Bandra',
        distanceKm: 8,
        interestedAtIso: '2026-05-17',
      },
      {
        id: 'b_arjun',
        name: 'Arjun K.',
        initial: 'A',
        locationLabel: 'Goregaon',
        distanceKm: 12,
        interestedAtIso: '2026-05-16',
      },
    ],
  },
  {
    id: 'l3',
    title: 'Royal Enfield Classic 350',
    description:
      'Classic 350 in cherry red. ~12,000 km, regular service. Custom seat + chrome exhaust. Looks and rides great.',
    priceInPaise: 12_500_000,
    images: [],
    location: 'Bandra East, Mumbai',
    postedAtIso: '2026-05-10',
    category: 'Vehicles › Bikes',
    condition: 'Used',
    status: 'live',
    viewCount: 287,
    interestCount: 8,
    seller: SELF,
    interestedBuyers: [
      {
        id: 'b_kunal',
        name: 'Kunal D.',
        initial: 'K',
        locationLabel: 'Khar',
        distanceKm: 3,
        interestedAtIso: '2026-05-16',
      },
    ],
  },
  {
    id: 'l4',
    title: 'Modular sofa set, 6-seater',
    description:
      'L-shaped modular sofa with reversible chaise. Beige fabric, 2 years old, hardly used. Comes with 2 throw pillows.',
    priceInPaise: 2_000_000,
    images: [],
    location: 'Powai, Mumbai',
    postedAtIso: '2026-05-08',
    category: 'Furniture & Home › Sofas',
    condition: 'Like new',
    status: 'live',
    viewCount: 45,
    interestCount: 1,
    seller: SELF,
    interestedBuyers: [],
  },
  {
    id: 'l5',
    title: 'Mountain bike — slightly used',
    description:
      'Hero Sprint Pro mountain bike. 21-gear, disc brakes, 26" wheels. Ridden ~50 km total.',
    priceInPaise: 1_200_000,
    images: [],
    location: 'Andheri East, Mumbai',
    postedAtIso: '2026-05-06',
    category: 'Sports & Hobby › Cycles',
    condition: 'Like new',
    status: 'rejected',
    rejectionReason:
      'Listing title contained a phone number. Please re-post without contact info — buyers get your phone automatically once they tap Buy.',
    seller: SELF,
  },
  {
    id: 'l6',
    title: 'Old college textbooks (bundle of 12)',
    description:
      'B.Tech CS textbooks — DBMS, OS, Networks, OOP, etc. Few highlights but all readable. Selling as bundle only.',
    priceInPaise: 80_000,
    images: [],
    location: 'Vile Parle, Mumbai',
    postedAtIso: '2026-04-28',
    category: 'Education & Books › College Books',
    condition: 'Used',
    status: 'sold',
    soldToName: 'Rohit S.',
    soldAtIso: '2026-05-12',
    seller: SELF,
  },
  {
    id: 'l7',
    title: 'Wooden study table with chair',
    description:
      'Solid sheesham wood study table with matching chair. 4 ft x 2 ft. Has 2 drawers. 3 years old, polished recently.',
    priceInPaise: 350_000,
    images: [],
    location: 'Santacruz, Mumbai',
    postedAtIso: '2026-04-20',
    category: 'Furniture & Home › Office Furniture',
    condition: 'Used',
    status: 'sold',
    soldToName: 'Priya M.',
    soldAtIso: '2026-05-04',
    seller: SELF,
  },

  // ---- A buyer-perspective fallback (someone else's live listing) ----
  {
    id: 'demo-1',
    title: 'iPhone 13 — 128GB, mint condition',
    description:
      'Selling my iPhone 13 (Midnight, 128GB). Used for ~14 months, always in case + screen protector. Battery health 91%. Includes original charger and box. No scratches, fully functional.',
    priceInPaise: 4_200_000,
    images: [],
    location: 'Andheri West, Mumbai',
    postedAtIso: '2026-05-17',
    category: 'Electronics › Mobiles',
    condition: 'Like new',
    status: 'live',
    viewCount: 312,
    interestCount: 7,
    seller: OTHER_SELLER,
  },
];

export const findStubListing = (id: string): StubListing | undefined =>
  STUB_LISTINGS.find(l => l.id === id);

export const isOwnedByCurrentSeller = (listing: StubListing): boolean =>
  listing.seller.id === STUB_CURRENT_SELLER_ID;

const STUB_PALETTE = [
  '#2BB32A',
  '#3B82F6',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#10B981',
  '#EC4899',
];

export const stubThumbColour = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % 1000;
  return STUB_PALETTE[hash % STUB_PALETTE.length];
};

export interface ListingCardShape {
  id: string;
  image?: string;
  title: string;
  price: string;
  location: string;
  time: string;
  badge?: string;
  badgeColor?: string;
}

const formatPrice = (paise: number): string => {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
};

export const toListingCardShape = (l: StubListing): ListingCardShape => ({
  id: l.id,
  image: l.images[0],
  title: l.title,
  price: formatPrice(l.priceInPaise),
  location: l.location,
  time: formatRelativeShort(l.postedAtIso),
  badge: l.condition,
});

export const STUB_LIVE_LISTINGS: StubListing[] = STUB_LISTINGS.filter(
  l => l.status === 'live',
);

export const formatRelativeShort = (iso: string): string => {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return iso;
  const diffMs = Date.now() - ts;
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};
