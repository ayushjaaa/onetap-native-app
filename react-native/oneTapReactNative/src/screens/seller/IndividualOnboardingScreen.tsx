import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  Plus,
  X,
} from 'lucide-react-native';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useToast } from '@/hooks/useToast';
import {
  colors,
  fontSize,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'IndividualOnboarding'>;

const NAME_MIN = 3;
const NAME_MAX = 40;
const BIO_MAX = 160;

// Stub list — replace with backend categories once /categories/top ships.
const SUGGESTED_CATEGORIES = [
  'Mobiles',
  'Vehicles',
  'Properties',
  'Furniture',
  'Fashion',
  'Electronics',
  'Sports',
  'Books',
  'Pets',
  'Services',
];

export const IndividualOnboardingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const user = useAppSelector(state => state.auth.user);

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didSucceed, setDidSucceed] = useState(false);

  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= NAME_MIN && trimmedName.length <= NAME_MAX;
  const bioValid = bio.length <= BIO_MAX;
  const canSubmit = nameValid && bioValid && !isSubmitting;

  const availableCategories = useMemo(
    () => SUGGESTED_CATEGORIES.filter(c => !categories.includes(c)),
    [categories],
  );

  const toggleCategory = (cat: string) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat],
    );
  };

  const handlePhotoPress = () => {
    // TODO: integrate image picker (shared with S10 photo grid).
    // For v1, surface a stub toast so the placeholder is testable.
    toast.info({
      title: 'Image picker coming with S10',
      message: "We'll wire camera / gallery as part of the post-ad flow.",
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      // TODO: real POST /seller/individual { displayName, bio, photoUrl, categories }
      await new Promise<void>(resolve => setTimeout(() => resolve(), 700));
      setDidSucceed(true);
    } catch {
      toast.error({
        title: "Couldn't activate seller account",
        message: 'Network issue — try again in a moment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickPackage = () => {
    // `replace` so back from PackageSelection doesn't land back on the
    // success modal (which has no clean re-entry path).
    navigation.replace('PackageSelection');
  };

  const handleBackToHome = () => {
    navigation.popToTop();
  };

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
        <Text style={styles.headerTitle}>Set up your seller profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={handlePhotoPress}
            style={({ pressed }) => [
              styles.avatarWrap,
              pressed && styles.avatarWrapPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Upload profile photo"
          >
            <View style={styles.avatarCircle}>
              {photoUri ? (
                <View style={styles.avatarFilled} />
              ) : (
                <Camera size={28} color={colors.primary} />
              )}
            </View>
            <Text style={styles.avatarHint}>
              {photoUri ? 'Change photo' : 'Add profile photo (optional)'}
            </Text>
          </Pressable>

          {/* Display name */}
          <Text style={styles.label}>Display name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your seller name"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, !nameValid && !!name && styles.inputError]}
            maxLength={NAME_MAX}
            editable={!isSubmitting}
          />
          <View style={styles.helperRow}>
            <Text style={styles.helperText}>Buyers ko ye dikhega</Text>
            <Text style={styles.counter}>
              {trimmedName.length}/{NAME_MAX}
            </Text>
          </View>

          {/* Bio */}
          <Text style={[styles.label, styles.labelSpaced]}>
            Short bio (optional)
          </Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="What do you sell? Where? Anything buyers should know."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.inputMultiline]}
            maxLength={BIO_MAX}
            multiline
            editable={!isSubmitting}
          />
          <View style={styles.helperRow}>
            <View />
            <Text style={styles.counter}>
              {bio.length}/{BIO_MAX}
            </Text>
          </View>

          {/* Categories */}
          <Text style={[styles.label, styles.labelSpaced]}>
            What do you sell? (optional)
          </Text>
          <View style={styles.chipsWrap}>
            {categories.map(cat => (
              <Pressable
                key={cat}
                onPress={() => toggleCategory(cat)}
                style={styles.chipSelected}
              >
                <Text style={styles.chipSelectedText}>{cat}</Text>
                <X size={layout.iconSize.sm} color={colors.primary} />
              </Pressable>
            ))}
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={styles.chipAdd}
              disabled={availableCategories.length === 0}
            >
              <Plus size={layout.iconSize.sm} color={colors.textSecondary} />
              <Text style={styles.chipAddText}>
                {categories.length === 0 ? 'Add categories' : 'Add'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.primaryBtn,
            !canSubmit && styles.primaryBtnDisabled,
            pressed && canSubmit && styles.primaryBtnPressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Activate seller account</Text>
          )}
        </Pressable>
      </View>

      {/* Category picker bottom sheet (lightweight Modal-based) */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setPickerOpen(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Pick categories you sell</Text>
          <ScrollView contentContainerStyle={styles.sheetGrid}>
            {availableCategories.map(cat => (
              <Pressable
                key={cat}
                onPress={() => {
                  toggleCategory(cat);
                }}
                style={styles.sheetChip}
              >
                <Text style={styles.sheetChipText}>{cat}</Text>
              </Pressable>
            ))}
            {availableCategories.length === 0 ? (
              <Text style={styles.sheetEmpty}>
                You've added all suggested categories.
              </Text>
            ) : null}
          </ScrollView>
          <Pressable
            onPress={() => setPickerOpen(false)}
            style={styles.sheetDoneBtn}
          >
            <Text style={styles.sheetDoneText}>Done</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Success overlay (full screen, after submit) */}
      <Modal
        visible={didSucceed}
        animationType="fade"
        transparent={false}
        onRequestClose={handleBackToHome}
      >
        <SafeAreaView style={styles.successSafe} edges={['top']}>
          <View style={styles.successContent}>
            <View style={styles.successCircle}>
              <CheckCircle2 size={72} color={colors.success} />
            </View>
            <Text style={styles.successTitle}>You're a verified seller! 🎉</Text>
            <Text style={styles.successBody}>
              Ab apna pehla product post karne ke liye ek package pick karein.
            </Text>
          </View>

          <View style={styles.bottomBar}>
            <Pressable
              onPress={handlePickPackage}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>Pick a package</Text>
            </Pressable>
            <Pressable
              onPress={handleBackToHome}
              hitSlop={spacing.md}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Back to home</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const AVATAR = 96;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
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
    paddingBottom: spacing.xl,
  },
  avatarWrap: {
    alignItems: 'center',
    marginTop: spacing.base,
    marginBottom: spacing.xl,
  },
  avatarWrapPressed: {
    opacity: 0.85,
  },
  avatarCircle: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1.5,
    borderColor: colors.primaryAlpha30,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarFilled: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
  },
  avatarHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  labelSpaced: {
    marginTop: spacing.lg,
  },
  input: {
    minHeight: layout.inputHeight,
    borderRadius: radius.lg,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.base,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.borderError,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    minHeight: fontSize.xs * 1.5,
  },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  counter: {
    ...typography.caption,
    color: colors.textMuted,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryAlpha15,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
  },
  chipSelectedText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  chipAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  chipAddText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  primaryBtn: {
    height: layout.buttonHeight,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: colors.primaryAlpha30,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    ...typography.button,
    color: colors.white,
  },
  secondaryBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryBtnText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: layout.sheetHandleWidth,
    height: layout.sheetHandleHeight,
    borderRadius: layout.sheetHandleHeight / 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.base,
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  sheetChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetChipText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  sheetEmpty: {
    ...typography.caption,
    color: colors.textMuted,
    padding: spacing.md,
  },
  sheetDoneBtn: {
    height: layout.buttonHeightMd,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  sheetDoneText: {
    ...typography.button,
    color: colors.white,
  },
  successSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  successBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: fontSize.base * 1.6,
  },
});
