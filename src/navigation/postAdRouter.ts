import type { MainStackParamList } from '@/types/navigation.types';
import { AADHAAR_KYC_ENABLED } from '@/config/featureFlags';

interface SellerStateLike {
  kycStatus?: 'pending' | 'verified' | 'rejected';
  aadhaarVerified?: boolean;
  sellerType?: string;
  sellerDisplayName?: string;
}

export const resolvePostAdDestination = (
  user: SellerStateLike | null,
): keyof MainStackParamList => {
  if (!user) return 'BecomeSellerIntro';
  if (user.kycStatus === 'verified') return 'ListProduct';
  if (AADHAAR_KYC_ENABLED && !user.aadhaarVerified) return 'BecomeSellerIntro';
  if (!user.sellerType) return 'SellerType';
  if (!user.sellerDisplayName) return 'IndividualOnboarding';
  return 'SellerPending';
};
