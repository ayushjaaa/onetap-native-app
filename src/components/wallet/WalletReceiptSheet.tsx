import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useGetWalletTransactionReceiptQuery } from '@/api/walletApi';
import { Shimmer } from '@/components/common/Shimmer';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { skipToken } from '@reduxjs/toolkit/query/react';

export interface WalletReceiptSheetProps {
  visible: boolean;
  transactionId: string | null;
  onClose: () => void;
}

const KIND_LABEL: Record<string, string> = {
  topup: 'Wallet top-up',
  package_purchase: 'Package purchased',
  bid_spend: 'Bid placed',
  bid_refund: 'Bid refunded',
  manual: 'Manual adjustment',
};

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatPaise = (paise: number): string =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export const WalletReceiptSheet: React.FC<WalletReceiptSheetProps> = ({
  visible,
  transactionId,
  onClose,
}) => {
  const { data, isFetching, isError } = useGetWalletTransactionReceiptQuery(
    visible && transactionId ? transactionId : skipToken,
  );

  const transaction = data?.transaction;
  const paymentOrder = data?.paymentOrder ?? null;
  const isCredit = transaction?.type === 'credit';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>Receipt</Text>
              <Pressable
                onPress={onClose}
                hitSlop={spacing.sm}
                style={styles.closeBtn}
              >
                <X size={layout.iconSize.md} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.body}>
              {isFetching ? (
                <>
                  <Shimmer height={20} style={styles.shimmerLine} />
                  <Shimmer height={20} style={styles.shimmerLine} />
                  <Shimmer height={20} style={styles.shimmerLine} />
                </>
              ) : isError || !transaction ? (
                <Text style={styles.errorText}>
                  Couldn't load this receipt. Please try again.
                </Text>
              ) : (
                <>
                  <Text
                    style={[
                      styles.amount,
                      { color: isCredit ? colors.success : colors.error },
                    ]}
                  >
                    {isCredit ? '+' : '−'}
                    {transaction.field === 'postCredits'
                      ? `${transaction.amount} ${
                          transaction.amount === 1 ? 'slot' : 'slots'
                        }`
                      : formatPaise(transaction.amount)}
                  </Text>
                  <Text style={styles.reason}>
                    {transaction.description || KIND_LABEL[transaction.kind]}
                  </Text>

                  <View style={styles.divider} />

                  <ReceiptRow
                    label="Date"
                    value={formatDateTime(transaction.createdAt)}
                  />
                  <ReceiptRow
                    label="Type"
                    value={KIND_LABEL[transaction.kind] ?? transaction.kind}
                  />
                  <ReceiptRow
                    label="Reference ID"
                    value={transaction._id}
                    monospace
                  />

                  {paymentOrder ? (
                    <>
                      <View style={styles.divider} />
                      <ReceiptRow
                        label="Razorpay order"
                        value={paymentOrder.razorpayOrderId}
                        monospace
                      />
                      {paymentOrder.razorpayPaymentId ? (
                        <ReceiptRow
                          label="Razorpay payment"
                          value={paymentOrder.razorpayPaymentId}
                          monospace
                        />
                      ) : null}
                      <ReceiptRow
                        label="Amount paid"
                        value={formatPaise(paymentOrder.amount)}
                      />
                      <ReceiptRow label="Status" value={paymentOrder.status} />
                    </>
                  ) : null}
                </>
              )}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const ReceiptRow: React.FC<{
  label: string;
  value: string;
  monospace?: boolean;
}> = ({ label, value, monospace }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text
      style={[styles.rowValue, monospace && styles.rowValueMono]}
      numberOfLines={1}
      ellipsizeMode="middle"
    >
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    maxHeight: '85%',
  },
  safeArea: {
    flex: 0,
  },
  handle: {
    alignSelf: 'center',
    width: layout.sheetHandleWidth,
    height: layout.sheetHandleHeight,
    borderRadius: radius.xs,
    backgroundColor: colors.border,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  shimmerLine: {
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  amount: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  reason: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  rowLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rowValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  rowValueMono: {
    fontFamily: 'monospace',
  },
});
