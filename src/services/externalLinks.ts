import { Linking } from 'react-native';
import {
  PRIVACY_POLICY_URL,
  SUPPORT_PHONE,
  TERMS_URL,
} from '@/config/constants';

// Resolve to false instead of throwing (no browser/dialer, e.g. a tablet without
// telephony), so callers can show their own fallback message.
const open = (url: string): Promise<boolean> =>
  Linking.openURL(url).then(
    () => true,
    () => false,
  );

export const externalLinks = {
  openPrivacyPolicy: () => open(PRIVACY_POLICY_URL),
  openTerms: () => open(TERMS_URL),
  callSupport: () => open(`tel:${SUPPORT_PHONE}`),
};
