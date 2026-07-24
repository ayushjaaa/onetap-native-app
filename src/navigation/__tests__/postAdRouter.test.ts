import { resolvePostAdDestination } from '@/navigation/postAdRouter';

describe('resolvePostAdDestination', () => {
  it('sends a logged-out user to BecomeSellerIntro', () => {
    expect(resolvePostAdDestination(null)).toBe('BecomeSellerIntro');
  });

  it('sends a user who has not picked a seller type to BecomeSellerIntro', () => {
    expect(resolvePostAdDestination({})).toBe('BecomeSellerIntro');
  });

  it('resumes at IndividualOnboarding once a seller type is picked but the profile is not submitted', () => {
    expect(resolvePostAdDestination({ sellerType: 'individual' })).toBe(
      'IndividualOnboarding',
    );
  });

  it('sends a submitted-but-not-approved seller back to BecomeSellerIntro (wallet-aware dashboard)', () => {
    expect(
      resolvePostAdDestination({
        sellerType: 'individual',
        sellerProfileSubmitted: true,
      }),
    ).toBe('BecomeSellerIntro');
  });

  it('only reaches ListProduct once isSellerApproved is true, regardless of the other flags', () => {
    expect(
      resolvePostAdDestination({
        sellerType: 'individual',
        sellerProfileSubmitted: true,
        isSellerApproved: true,
      }),
    ).toBe('ListProduct');
  });

  it('trusts isSellerApproved even if earlier steps look incomplete (approval is the only real gate)', () => {
    expect(resolvePostAdDestination({ isSellerApproved: true })).toBe(
      'ListProduct',
    );
  });
});
