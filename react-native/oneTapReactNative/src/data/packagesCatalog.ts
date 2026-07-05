// Stub catalog of posting packages.
// Replace with `GET /listings/packages` once the listing service exposes it.
// Kept in /data (not /api) on purpose: this is the canonical client-side
// fallback while the admin-controlled API isn't live.

export interface PackagePlan {
  id: string;
  name: string;
  priceInPaise: number;
  originalPriceInPaise?: number;
  postSlots: number;
  validityDays: number;
  benefits: string[];
  popular?: boolean;
}

export const STUB_PACKAGES: PackagePlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceInPaise: 4900,
    postSlots: 1,
    validityDays: 90,
    benefits: ['Photos up to 8 per ad', 'Valid for 90 days'],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceInPaise: 19900,
    originalPriceInPaise: 24900,
    postSlots: 5,
    validityDays: 90,
    benefits: [
      'Photos up to 8 per ad',
      'Priority in feed',
      'Valid for 90 days',
    ],
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    priceInPaise: 49900,
    postSlots: 15,
    validityDays: 180,
    benefits: [
      'Photos up to 8 per ad',
      'Priority in feed',
      'Valid for 180 days',
    ],
  },
];

export const findPackage = (id: string): PackagePlan | undefined =>
  STUB_PACKAGES.find(p => p.id === id);

export const formatINR = (paise: number): string => {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};
