import {
  Bell,
  CheckCircle2,
  IndianRupee,
  Package as PackageIcon,
  ShieldCheck,
  ShieldOff,
  XCircle,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme';

// Keyed on the backend's real event-derived `type` strings (see
// notification-service/src/seeds/seedNotificationTemplates.ts). Unlike the old
// stub's closed enum, this is a free-form string, so both lookups fall back to
// a sensible default instead of assuming every possible key is mapped here.
const ICON_BY_TYPE: Record<string, LucideIcon> = {
  'listing.approved': CheckCircle2,
  'listing.rejected': XCircle,
  'transaction.completed': CheckCircle2,
  'payment.completed': IndianRupee,
  'post_slots.granted': PackageIcon,
  'kyc.approved': ShieldCheck,
  'kyc.aadhaar_verified': ShieldCheck,
  'kyc.rejected': ShieldOff,
  'user.suspended': ShieldOff,
  'user.reinstated': ShieldCheck,
};

const COLOUR_BY_TYPE: Record<string, string> = {
  'listing.approved': colors.success,
  'listing.rejected': colors.error,
  'transaction.completed': colors.success,
  'payment.completed': colors.primary,
  'post_slots.granted': colors.primary,
  'kyc.approved': colors.success,
  'kyc.aadhaar_verified': colors.success,
  'kyc.rejected': colors.error,
  'user.suspended': colors.error,
  'user.reinstated': colors.success,
};

export const TYPE_ICON = (type: string): LucideIcon =>
  ICON_BY_TYPE[type] ?? Bell;
export const TYPE_COLOUR = (type: string): string =>
  COLOUR_BY_TYPE[type] ?? colors.textMuted;
