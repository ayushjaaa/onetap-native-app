import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react-native';
import {
  type CategoryNode,
  resolveCategoryPath,
  STUB_CATEGORY_TREE,
} from '@/data/categoryTree';
import { colors, layout, radius, spacing, typography } from '@/theme';

export interface CategoryPickResult {
  /** Terminal category id (may be sub-level if tree is 2-deep). */
  categoryId: string;
  /** Breadcrumb of node names from top → terminal. */
  categoryPath: string[];
}

export interface CategoryPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  initialCategoryId?: string;
  categoryTree?: CategoryNode[];
  onPick: (result: CategoryPickResult) => void;
}

type DrillLevel = 'top' | 'sub' | 'leaf' | null;

/**
 * Single-purpose picker used by the post-ad form (and any future caller that
 * needs to pick a terminal category id). Unlike MarketplaceFilterSheet there
 * is no price section, no Apply button — picking a terminal node commits the
 * selection and closes the sheet immediately.
 */
export const CategoryPickerSheet: React.FC<CategoryPickerSheetProps> = ({
  visible,
  onClose,
  initialCategoryId,
  categoryTree = STUB_CATEGORY_TREE,
  onPick,
}) => {
  const [topId, setTopId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [leafId, setLeafId] = useState<string | null>(null);
  const [openLevel, setOpenLevel] = useState<DrillLevel>('top');

  // Re-seed only when the sheet opens or a different initialCategoryId is
  // passed in. Deliberately excludes `categoryTree` from the deps: RTK Query
  // hands back a new array reference on every refetch, and re-running this
  // while the sheet is open would wipe an in-progress drill-down selection.
  useEffect(() => {
    if (!visible) return;
    setTopId(null);
    setSubId(null);
    setLeafId(null);
    setOpenLevel('top');

    if (!initialCategoryId) return;
    for (const top of categoryTree) {
      for (const sub of top.children ?? []) {
        if (sub.id === initialCategoryId) {
          setTopId(top.id);
          setSubId(sub.id);
          setOpenLevel(null);
          return;
        }
        for (const leaf of sub.children ?? []) {
          if (leaf.id === initialCategoryId) {
            setTopId(top.id);
            setSubId(sub.id);
            setLeafId(leaf.id);
            setOpenLevel(null);
            return;
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialCategoryId]);

  const topNode = topId ? categoryTree.find(n => n.id === topId) ?? null : null;
  const subNode = topNode?.children?.find(n => n.id === subId) ?? null;
  const leafNode = subNode?.children?.find(n => n.id === leafId) ?? null;
  const subIsTerminal = !!subNode && !subNode.children?.length;

  const commit = (terminalId: string) => {
    onPick({
      categoryId: terminalId,
      categoryPath: resolveCategoryPath(terminalId, categoryTree),
    });
    onClose();
  };

  const pickTop = (id: string) => {
    setTopId(id);
    setSubId(null);
    setLeafId(null);
    setOpenLevel('sub');
  };

  const pickSub = (id: string) => {
    setSubId(id);
    setLeafId(null);
    const newSub = topNode?.children?.find(n => n.id === id) ?? null;
    if (newSub && !newSub.children?.length) {
      // 2-level tree branch — sub IS the terminal, commit immediately.
      commit(id);
      return;
    }
    setOpenLevel('leaf');
  };

  const pickLeaf = (id: string) => {
    setLeafId(id);
    commit(id);
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
              <Text style={styles.title}>Pick a category</Text>
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
              <DrillField
                testID="category-picker-top-field"
                title="Top level"
                placeholder="Choose a category"
                value={topNode?.name ?? null}
                open={openLevel === 'top'}
                onPress={() => setOpenLevel(openLevel === 'top' ? null : 'top')}
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
                    ? `Choose ${topNode.name.toLowerCase()} subcategory`
                    : '— choose top first —'
                }
                value={subNode?.name ?? null}
                disabled={!topNode}
                open={openLevel === 'sub'}
                onPress={() => setOpenLevel(openLevel === 'sub' ? null : 'sub')}
              />
              {openLevel === 'sub' && topNode ? (
                <DrillOptions
                  options={topNode.children ?? []}
                  selectedId={subId}
                  onPick={pickSub}
                />
              ) : null}

              {subNode && !subIsTerminal ? (
                <>
                  <DrillField
                    title="Leaf"
                    placeholder={`Pick a ${subNode.name.toLowerCase()}`}
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

              {topNode == null ? (
                <Text style={styles.hint}>
                  Pick a top level category. Subcategories aapko niche dikhayi
                  denge.
                </Text>
              ) : null}
            </ScrollView>
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
  testID?: string;
}

const DrillField: React.FC<DrillFieldProps> = ({
  title,
  placeholder,
  value,
  disabled = false,
  open = false,
  onPress,
  testID,
}) => (
  <View style={styles.drillWrap}>
    <Text style={styles.drillTitle}>{title}</Text>
    <Pressable
      testID={testID}
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
            testID={`category-option-${opt.id}`}
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
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },

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
});
