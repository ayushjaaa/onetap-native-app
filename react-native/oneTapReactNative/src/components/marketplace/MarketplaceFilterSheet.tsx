import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react-native';
import {
  type CategoryNode,
  resolveCategoryPath,
  STUB_CATEGORY_TREE,
} from '@/data/categoryTree';
import {
  colors,
  fontSize,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme';

export interface AppliedFilters {
  /** Leaf category id; only level-2 ids should ever be sent server-side. */
  categoryId?: string;
  /** Breadcrumb names of the chosen leaf, for display in callers. */
  categoryPath?: string[];
  /** Rupees (NOT paise). Optional; server treats undefined as no bound. */
  minPrice?: number;
  maxPrice?: number;
}

export interface MarketplaceFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  initialFilters?: AppliedFilters;
  categoryTree?: CategoryNode[];
  onApply: (filters: AppliedFilters) => void;
}

type DrillLevel = 'top' | 'sub' | 'leaf' | null;

export const MarketplaceFilterSheet: React.FC<MarketplaceFilterSheetProps> = ({
  visible,
  onClose,
  initialFilters,
  categoryTree = STUB_CATEGORY_TREE,
  onApply,
}) => {
  // Resolve the drilled levels from a category id (so the sheet can reopen
  // with the user's last applied selection intact). Handles trees where the
  // sub level IS the leaf (no grandchildren) by treating the matched sub as
  // the leaf and leaving leafId null.
  const seed = useMemo(() => {
    if (!initialFilters?.categoryId) {
      return { topId: null, subId: null, leafId: null };
    }
    for (const top of categoryTree) {
      for (const sub of top.children ?? []) {
        if (sub.id === initialFilters.categoryId) {
          return { topId: top.id, subId: sub.id, leafId: null };
        }
        for (const leaf of sub.children ?? []) {
          if (leaf.id === initialFilters.categoryId) {
            return { topId: top.id, subId: sub.id, leafId: leaf.id };
          }
        }
      }
    }
    return { topId: null, subId: null, leafId: null };
  }, [initialFilters?.categoryId, categoryTree]);

  const [topId, setTopId] = useState<string | null>(seed.topId);
  const [subId, setSubId] = useState<string | null>(seed.subId);
  const [leafId, setLeafId] = useState<string | null>(seed.leafId);
  const [minStr, setMinStr] = useState<string>(
    initialFilters?.minPrice != null ? String(initialFilters.minPrice) : '',
  );
  const [maxStr, setMaxStr] = useState<string>(
    initialFilters?.maxPrice != null ? String(initialFilters.maxPrice) : '',
  );
  const [openLevel, setOpenLevel] = useState<DrillLevel>(null);

  // Re-seed when the sheet is reopened with new initialFilters.
  useEffect(() => {
    if (visible) {
      setTopId(seed.topId);
      setSubId(seed.subId);
      setLeafId(seed.leafId);
      setMinStr(
        initialFilters?.minPrice != null ? String(initialFilters.minPrice) : '',
      );
      setMaxStr(
        initialFilters?.maxPrice != null ? String(initialFilters.maxPrice) : '',
      );
      setOpenLevel(null);
    }
  }, [visible, seed, initialFilters?.minPrice, initialFilters?.maxPrice]);

  const topNode = topId
    ? categoryTree.find(n => n.id === topId) ?? null
    : null;
  const subNode = topNode?.children?.find(n => n.id === subId) ?? null;
  const leafNode = subNode?.children?.find(n => n.id === leafId) ?? null;
  // When a tree only goes 2 levels deep, the selected sub is itself the
  // terminal node we filter by. Hide the leaf drill entirely in that case.
  const subIsTerminal = !!subNode && !(subNode.children?.length);
  const effectiveCategoryId = leafId ?? (subIsTerminal ? subNode.id : null);

  const minNum = minStr.trim() === '' ? undefined : Number(minStr);
  const maxNum = maxStr.trim() === '' ? undefined : Number(maxStr);
  const priceInvalid =
    minNum != null &&
    maxNum != null &&
    Number.isFinite(minNum) &&
    Number.isFinite(maxNum) &&
    maxNum < minNum;
  const priceMalformed =
    (minStr.trim() !== '' && !Number.isFinite(minNum)) ||
    (maxStr.trim() !== '' && !Number.isFinite(maxNum));

  const canApply = !priceInvalid && !priceMalformed;

  const handleClear = () => {
    setTopId(null);
    setSubId(null);
    setLeafId(null);
    setMinStr('');
    setMaxStr('');
    setOpenLevel(null);
  };

  const handleApply = () => {
    if (!canApply) return;
    onApply({
      categoryId: effectiveCategoryId ?? undefined,
      categoryPath: effectiveCategoryId
        ? resolveCategoryPath(effectiveCategoryId, categoryTree)
        : undefined,
      minPrice: minNum,
      maxPrice: maxNum,
    });
    onClose();
  };

  const pickTop = (id: string) => {
    setTopId(id);
    setSubId(null);
    setLeafId(null);
    setOpenLevel('sub'); // auto-progress
  };

  const pickSub = (id: string) => {
    setSubId(id);
    setLeafId(null);
    // Only auto-progress to leaf if the chosen sub actually has children.
    const newSub = topNode?.children?.find(n => n.id === id) ?? null;
    setOpenLevel(newSub?.children?.length ? 'leaf' : null);
  };

  const pickLeaf = (id: string) => {
    setLeafId(id);
    setOpenLevel(null);
  };

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
              <Text style={styles.title}>Filters</Text>
              <Pressable
                onPress={handleClear}
                hitSlop={spacing.sm}
                style={styles.resetLink}
              >
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                hitSlop={spacing.sm}
                style={styles.closeBtn}
              >
                <X size={layout.iconSize.md} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sectionLabel}>CATEGORY</Text>

              <DrillField
                title="Top level"
                placeholder="All categories"
                value={topNode?.name ?? null}
                open={openLevel === 'top'}
                onPress={() =>
                  setOpenLevel(openLevel === 'top' ? null : 'top')
                }
              />
              {openLevel === 'top' ? (
                <DrillOptions
                  options={categoryTree}
                  selectedId={topId}
                  onPick={pickTop}
                />
              ) : null}

              <DrillField
                title="Subcategory"
                placeholder={
                  topNode
                    ? `Any ${topNode.name.toLowerCase()} subcategory`
                    : '— choose top first —'
                }
                value={subNode?.name ?? null}
                disabled={!topNode}
                open={openLevel === 'sub'}
                onPress={() =>
                  setOpenLevel(openLevel === 'sub' ? null : 'sub')
                }
              />
              {openLevel === 'sub' && topNode ? (
                <DrillOptions
                  options={topNode.children ?? []}
                  selectedId={subId}
                  onPick={pickSub}
                />
              ) : null}

              {/* Leaf drill only renders when the picked sub actually has
                  children — keeps the UI honest for 2-level trees. */}
              {subNode && !subIsTerminal ? (
                <>
                  <DrillField
                    title="Leaf"
                    placeholder={`Any ${subNode.name.toLowerCase()}`}
                    value={leafNode?.name ?? null}
                    open={openLevel === 'leaf'}
                    onPress={() =>
                      setOpenLevel(openLevel === 'leaf' ? null : 'leaf')
                    }
                  />
                  {openLevel === 'leaf' ? (
                    <DrillOptions
                      options={subNode.children ?? []}
                      selectedId={leafId}
                      onPick={pickLeaf}
                    />
                  ) : null}
                </>
              ) : null}

              <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
                PRICE RANGE
              </Text>
              <View style={styles.priceRow}>
                <View style={styles.priceFieldWrap}>
                  <Text style={styles.priceLabel}>Min ₹</Text>
                  <TextInput
                    value={minStr}
                    onChangeText={setMinStr}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.priceInput,
                      (priceInvalid || priceMalformed) && styles.priceInputError,
                    ]}
                  />
                </View>
                <View style={styles.priceFieldWrap}>
                  <Text style={styles.priceLabel}>Max ₹</Text>
                  <TextInput
                    value={maxStr}
                    onChangeText={setMaxStr}
                    keyboardType="number-pad"
                    placeholder="No limit"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.priceInput,
                      (priceInvalid || priceMalformed) && styles.priceInputError,
                    ]}
                  />
                </View>
              </View>
              {priceInvalid ? (
                <Text style={styles.priceHintError}>
                  Max must be more than Min
                </Text>
              ) : priceMalformed ? (
                <Text style={styles.priceHintError}>
                  Enter numbers only
                </Text>
              ) : (
                <Text style={styles.priceHint}>
                  Leave blank for no limit
                </Text>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable onPress={handleClear} style={styles.clearBtn}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
              <Pressable
                onPress={handleApply}
                disabled={!canApply}
                style={({ pressed }) => [
                  styles.applyBtn,
                  !canApply && styles.applyBtnDisabled,
                  pressed && canApply && styles.applyBtnPressed,
                ]}
              >
                <Text style={styles.applyText}>Apply filters</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ---- Subcomponents ----------------------------------------------------------

interface DrillFieldProps {
  title: string;
  placeholder: string;
  value: string | null;
  disabled?: boolean;
  open?: boolean;
  onPress: () => void;
}

const DrillField: React.FC<DrillFieldProps> = ({
  title,
  placeholder,
  value,
  disabled = false,
  open = false,
  onPress,
}) => (
  <View style={styles.drillWrap}>
    <Text style={styles.drillTitle}>{title}</Text>
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.drillField,
        open && styles.drillFieldOpen,
        disabled && styles.drillFieldDisabled,
        pressed && !disabled && styles.drillFieldPressed,
      ]}
    >
      <Text
        style={[
          styles.drillFieldText,
          !value && styles.drillFieldPlaceholder,
          disabled && styles.drillFieldTextDisabled,
        ]}
        numberOfLines={1}
      >
        {value ?? placeholder}
      </Text>
      <ChevronDown
        size={layout.iconSize.sm}
        color={disabled ? colors.textDisabled : colors.textMuted}
        style={open ? styles.chevronOpen : undefined}
      />
    </Pressable>
  </View>
);

interface DrillOptionsProps {
  options: CategoryNode[];
  selectedId: string | null;
  onPick: (id: string) => void;
}

const DrillOptions: React.FC<DrillOptionsProps> = ({
  options,
  selectedId,
  onPick,
}) => {
  if (options.length === 0) {
    return (
      <View style={styles.drillEmpty}>
        <Text style={styles.drillEmptyText}>Nothing to pick here.</Text>
      </View>
    );
  }
  return (
    <View style={styles.drillOptions}>
      {options.map(opt => {
        const isSelected = opt.id === selectedId;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onPick(opt.id)}
            style={({ pressed }) => [
              styles.drillOptionRow,
              pressed && styles.drillOptionRowPressed,
            ]}
          >
            {isSelected ? (
              <Check size={layout.iconSize.sm} color={colors.primary} />
            ) : (
              <ChevronRight
                size={layout.iconSize.sm}
                color={colors.textMuted}
              />
            )}
            <Text
              style={[
                styles.drillOptionText,
                isSelected && styles.drillOptionTextSelected,
              ]}
            >
              {opt.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

// ---- Styles -----------------------------------------------------------------

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
    maxHeight: '90%',
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
    gap: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  resetLink: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  resetText: {
    ...typography.label,
    color: colors.primary,
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
    paddingBottom: spacing.lg,
  },

  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  sectionLabelSpaced: {
    marginTop: spacing.xl,
  },

  // Drill field
  drillWrap: {
    marginBottom: spacing.sm,
  },
  drillTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  drillField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: layout.inputHeight,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  drillFieldOpen: {
    borderColor: colors.primary,
  },
  drillFieldDisabled: {
    opacity: 0.5,
  },
  drillFieldPressed: {
    opacity: 0.9,
  },
  drillFieldText: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  drillFieldPlaceholder: {
    color: colors.textMuted,
  },
  drillFieldTextDisabled: {
    color: colors.textDisabled,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  drillOptions: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  drillOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  drillOptionRowPressed: {
    backgroundColor: colors.whiteAlpha04,
  },
  drillOptionText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  drillOptionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  drillEmpty: {
    padding: spacing.base,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
  },
  drillEmptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Price
  priceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  priceFieldWrap: {
    flex: 1,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  priceInput: {
    height: layout.inputHeight,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  priceInputError: {
    borderColor: colors.borderError,
  },
  priceHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  priceHintError: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },

  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearBtn: {
    flex: 1,
    height: layout.buttonHeightMd,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    height: layout.buttonHeightMd,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnDisabled: {
    backgroundColor: colors.primaryAlpha30,
  },
  applyBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  applyText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});
