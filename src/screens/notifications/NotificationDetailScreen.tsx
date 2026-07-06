import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainScreenProps } from '@/types/navigation.types';
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Package as PackageIcon,
  ShieldAlert,
  ShieldCheck,
  Wallet as WalletIcon,
  XCircle,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useMarkNotificationReadMutation } from '@/api/notificationApi';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Props = MainScreenProps<'NotificationDetail'>;

// Same mapping as NotificationCenterScreen — kept local rather than shared
// since each screen's fallback/default differs slightly.
const TYPE_ICON: Record<string, LucideIcon> = {
  'kyc.approved': ShieldCheck,
  'kyc.rejected': ShieldAlert,
  'kyc.aadhaar_verified': ShieldCheck,
  'payment.completed': CreditCard,
  'post_slots.granted': PackageIcon,
  'listing.approved': CheckCircle2,
  'listing.rejected': XCircle,
  'transaction.completed': WalletIcon,
  'user.suspended': ShieldAlert,
  'user.reinstated': ShieldCheck,
};

const TYPE_COLOUR: Record<string, string> = {
  'kyc.approved': colors.success,
  'kyc.rejected': colors.error,
  'kyc.aadhaar_verified': colors.success,
  'payment.completed': colors.primary,
  'post_slots.granted': colors.primary,
  'listing.approved': colors.success,
  'listing.rejected': colors.error,
  'transaction.completed': colors.success,
  'user.suspended': colors.error,
  'user.reinstated': colors.success,
};

const formatFullDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

interface ActionDef {
  label: string;
  onPress: (navigation: Nav) => void;
}

// Every action here targets an existing screen — there is no per-type
// "always available" action, since e.g. a suspended/reinstated account or a
// KYC update has nowhere else to deep-link to today.
function getAction(
  type: string,
  payload: Record<string, unknown> | undefined,
): ActionDef | null {
  const listingId = payload?.listingId as string | undefined;

  switch (type) {
    case 'listing.approved':
    case 'listing.rejected':
      return listingId
        ? {
            label: 'View listing',
            onPress: nav => nav.navigate('ListingDetail', { listingId }),
          }
        : null;
    case 'transaction.completed':
      return {
        label: 'View transaction',
        onPress: nav => nav.navigate('PurchaseHistory'),
      };
    case 'post_slots.granted':
    case 'payment.completed':
      return {
        label: 'View wallet',
        onPress: nav => nav.navigate('ProductWallet'),
      };
    default:
      return null;
  }
}

export const NotificationDetailScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const { notification } = route.params;
  const [markRead] = useMarkNotificationReadMutation();

  useEffect(() => {
    if (notification.status !== 'read') {
      void markRead(notification._id);
    }
    // Only ever needs to fire once per screen instance, regardless of later
    // renders — re-running on notification/markRead identity changes would
    // re-issue the same mutation for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Icon = TYPE_ICON[notification.type] ?? Bell;
  const tint = TYPE_COLOUR[notification.type] ?? colors.textMuted;
  const action = getAction(notification.type, notification.payload);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={navigation.goBack}
          hitSlop={spacing.md}
          style={styles.backBtn}
        >
          <ChevronLeft size={layout.iconSize.lg} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Notification</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: hexToAlpha(tint, 0.15) },
            { borderColor: hexToAlpha(tint, 0.35) },
          ]}
        >
          <Icon size={layout.iconSize.xl} color={tint} />
        </View>

        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.date}>
          {formatFullDate(notification.createdAt)}
        </Text>

        <View style={styles.bodyCard}>
          <Text style={styles.body}>{notification.body}</Text>
        </View>

        {action ? (
          <Pressable
            onPress={() => action.onPress(navigation)}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.actionBtnPressed,
            ]}
          >
            <Text style={styles.actionBtnText}>{action.label}</Text>
            <ChevronRight size={layout.iconSize.sm} color={colors.white} />
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

function hexToAlpha(value: string, alpha: number): string {
  if (value.startsWith('#') && (value.length === 7 || value.length === 4)) {
    const hex =
      value.length === 4
        ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
        : value;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (value.startsWith('rgba(')) return value;
  if (value.startsWith('rgb(')) {
    return value.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  return value;
}

const ICON_CIRCLE = 72;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    flex: 1,
  },
  headerSpacer: {
    width: layout.closeButton,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing['3xl'],
    alignItems: 'center',
  },
  iconCircle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  date: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  bodyCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.base,
    marginTop: spacing.xl,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: fontSize.base * 1.6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    height: layout.buttonHeightMd,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    marginTop: spacing.xl,
  },
  actionBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  actionBtnText: {
    ...typography.button,
    color: colors.white,
  },
});
