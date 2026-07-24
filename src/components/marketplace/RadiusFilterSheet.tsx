import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { MapPin } from 'lucide-react-native';
import { RADIUS_MIN_KM, RADIUS_MAX_KM } from '@/config/constants';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';

interface RadiusFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Committed value when the sheet opens — slider starts here. */
  currentRadiusKm: number;
  /** Called only when "Apply" is pressed, never while dragging. */
  onApply: (radiusKm: number) => void;
  /** "Bangalore" while browsing a city, or null for the real-GPS mode. */
  modeLabel: string | null;
}

export const RadiusFilterSheet: React.FC<RadiusFilterSheetProps> = ({
  visible,
  onClose,
  currentRadiusKm,
  onApply,
  modeLabel,
}) => {
  // Local draft — dragging the slider only updates this, never Redux, so
  // nothing (and no network refetch) happens until "Apply" is pressed.
  const [draftKm, setDraftKm] = useState(currentRadiusKm);

  useEffect(() => {
    if (visible) setDraftKm(currentRadiusKm);
  }, [visible, currentRadiusKm]);

  const handleApply = () => {
    onApply(Math.round(draftKm));
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <MapPin size={layout.iconSize.sm} color={colors.primary} />
          <Text style={styles.title}>
            {modeLabel
              ? `Search radius in ${modeLabel}`
              : 'Search radius near you'}
          </Text>
        </View>
        <Text style={styles.subtitle}>
          Only show listings within this distance.
        </Text>

        <Text style={styles.valueLabel} testID="radius-filter-value">
          {Math.round(draftKm)} km
        </Text>

        <Slider
          testID="radius-filter-slider"
          style={styles.slider}
          minimumValue={RADIUS_MIN_KM}
          maximumValue={RADIUS_MAX_KM}
          step={1}
          value={draftKm}
          onValueChange={setDraftKm}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
        <View style={styles.rangeRow}>
          <Text style={styles.rangeText}>{RADIUS_MIN_KM} km</Text>
          <Text style={styles.rangeText}>{RADIUS_MAX_KM} km</Text>
        </View>

        <Pressable
          onPress={handleApply}
          testID="radius-filter-apply-button"
          style={styles.applyBtn}
        >
          <Text style={styles.applyBtnText}>Apply</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    flexShrink: 1,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  valueLabel: {
    ...typography.h2,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  rangeText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  applyBtn: {
    height: layout.buttonHeight,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    ...typography.button,
    color: colors.white,
    fontSize: fontSize.base,
  },
});
