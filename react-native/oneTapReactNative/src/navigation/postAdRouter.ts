import type { MainStackParamList } from '@/types/navigation.types';

interface SellerStateLike {
  aadhaarVerified?: boolean;
  isSellerApproved?: boolean;
}

export const resolvePostAdDestination = (
  user: SellerStateLike | null,
): keyof MainStackParamList => {
  if (!user) return 'BecomeSellerIntro';
  if (user.isSellerApproved) return 'ListProduct';
  if (user.aadhaarVerified) return 'SellerType';
  return 'BecomeSellerIntro';
};
