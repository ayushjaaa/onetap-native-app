import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Flag } from 'lucide-react-native';
import { colors, layout, radius, spacing, typography } from '@/theme';

// Backend stores the reason as free text (ListingReport.reason, max 500 chars),
// so the label itself is what's sent. 'Other' sends the user's own text instead.
export const REPORT_REASONS = [
  'Scam or fraud',
  'Wrong or misleading info',
  'Prohibited or illegal item',
  'Already sold',
  'Offensive content',
  'Other',
] as const;

const OTHER = 'Other';
const MIN_OTHER_LENGTH = 10;
const MAX_REASON_LENGTH = 500;

export interface ReportListingSheetProps {
  visible: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const ReportListingSheet: React.FC<ReportListingSheetProps> = ({
  visible,
  submitting,
  onClose,
  onSubmit,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState('');

  // Fresh form every time the sheet opens.
  useEffect(() => {
    if (visible) {
      setSelected(null);
      setDetails('');
    }
  }, [visible]);

  const isOther = selected === OTHER;
  const trimmedDetails = details.trim();
  const canSubmit =
    !submitting &&
    selected !== null &&
    (!isOther || trimmedDetails.length >= MIN_OTHER_LENGTH);

  const handleSubmit = () => {
    if (!canSubmit || !selected) return;
    onSubmit(isOther ? trimmedDetails : selected);
  };

  const close = () => {
    if (!submitting) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={styles.sheet} testID="report-listing-sheet">
          <View style={styles.handle} />
          <View style={styles.header}>
            <Flag size={layout.iconSize.sm} color={colors.error} />
            <Text style={styles.title}>Report this listing</Text>
          </View>
          <Text style={styles.subtitle}>
            Your report is anonymous. Our team reviews every report.
          </Text>

          <View accessibilityRole="radiogroup">
            {REPORT_REASONS.map(reason => {
              const active = selected === reason;
              return (
                <Pressable
                  key={reason}
                  onPress={() => setSelected(reason)}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && styles.optionPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  testID={`report-reason-${reason}`}
                >
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Text style={styles.optionText}>{reason}</Text>
                </Pressable>
              );
            })}
          </View>

          {isOther ? (
            <TextInput
              style={styles.input}
              value={details}
              onChangeText={setDetails}
              placeholder="Tell us what's wrong (at least 10 characters)"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={MAX_REASON_LENGTH}
              editable={!submitting}
              autoFocus
              testID="report-other-input"
            />
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            testID="report-submit-button"
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Submit report</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const RADIO_SIZE = 20;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: layout.sheetHandleWidth,
    height: layout.sheetHandleHeight,
    borderRadius: radius.xs,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  optionPressed: {
    opacity: 0.6,
  },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    borderRadius: RADIO_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: RADIO_SIZE / 2,
    height: RADIO_SIZE / 2,
    borderRadius: RADIO_SIZE / 4,
    backgroundColor: colors.primary,
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 88,
    textAlignVertical: 'top',
    marginTop: spacing.sm,
  },
  submitBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.error,
    borderRadius: radius.lg,
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitText: {
    ...typography.button,
    color: colors.white,
  },
});
