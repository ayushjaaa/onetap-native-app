import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker } from 'react-native-maps';
import { ChevronLeft, MapPin, RotateCcw, Search } from 'lucide-react-native';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  locationService,
  type CitySearchResult,
} from '@/services/locationService';
import {
  setBrowsingLocation,
  clearBrowsingLocation,
} from '@/store/locationSlice';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ChangeLocation'>;

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
// Roughly a city-scale view — small enough to read street layout, big
// enough that a single point doesn't look like an unexplained empty map.
const PREVIEW_DELTA = 0.05;

export const ChangeLocationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const browsingLocation = useAppSelector(
    state => state.location.browsingLocation,
  );

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [selected, setSelected] = useState<CitySearchResult | null>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    locationService
      .searchCityByName(debouncedQuery)
      .then(found => {
        if (cancelled) return;
        setResults(found);
        setStatus('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setResults([]);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleConfirm = () => {
    if (!selected) return;
    dispatch(
      setBrowsingLocation({
        latitude: selected.latitude,
        longitude: selected.longitude,
        city: selected.city ?? selected.displayName,
        state: selected.state ?? null,
        address: selected.displayName,
        pincode: null,
      }),
    );
    navigation.goBack();
  };

  const handleReset = () => {
    dispatch(clearBrowsingLocation());
    navigation.goBack();
  };

  // Preview step: a city was picked from search, confirm it on the map
  // before actually switching the browsing location.
  if (selected) {
    return (
      <SafeAreaView
        style={styles.safe}
        edges={['top']}
        testID="change-location-screen"
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => setSelected(null)}
            hitSlop={spacing.md}
            style={styles.backBtn}
            testID="change-location-preview-back"
          >
            <ChevronLeft size={layout.iconSize.lg} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Confirm location</Text>
          <View style={styles.headerSpacer} />
        </View>

        <MapView
          style={styles.map}
          testID="change-location-map"
          initialRegion={{
            latitude: selected.latitude,
            longitude: selected.longitude,
            latitudeDelta: PREVIEW_DELTA,
            longitudeDelta: PREVIEW_DELTA,
          }}
        >
          <Marker
            coordinate={{
              latitude: selected.latitude,
              longitude: selected.longitude,
            }}
            title={selected.city ?? selected.displayName}
          />
        </MapView>

        <View style={styles.previewFooter}>
          <Text style={styles.previewTitle} numberOfLines={1}>
            {selected.city ?? selected.displayName}
          </Text>
          <Text style={styles.previewSubtitle} numberOfLines={2}>
            {selected.displayName}
          </Text>
          <Pressable
            onPress={handleConfirm}
            testID="change-location-confirm-button"
            style={styles.confirmBtn}
          >
            <Text style={styles.confirmBtnText}>Use this location</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top']}
      testID="change-location-screen"
    >
      <View style={styles.header}>
        <Pressable
          onPress={navigation.goBack}
          hitSlop={spacing.md}
          style={styles.backBtn}
        >
          <ChevronLeft size={layout.iconSize.lg} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Change location</Text>
        <View style={styles.headerSpacer} />
      </View>

      {browsingLocation ? (
        <Pressable
          onPress={handleReset}
          testID="change-location-reset-button"
          style={styles.resetRow}
        >
          <RotateCcw size={layout.iconSize.sm} color={colors.primary} />
          <Text style={styles.resetText}>
            Browsing {browsingLocation.city ?? 'a different area'} — reset to my
            location
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.searchBox}>
        <Search size={layout.iconSize.md} color={colors.primary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search a city, e.g. Indore"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoFocus
          testID="change-location-search-input"
        />
      </View>

      {status === 'loading' ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : status === 'error' ? (
        <View style={styles.centerBlock}>
          <Text style={styles.errorText}>
            Couldn't search right now. Check your connection and try again.
          </Text>
        </View>
      ) : query.trim().length > 0 &&
        query.trim().length < MIN_QUERY_LENGTH ? null : results.length === 0 &&
        debouncedQuery.length >= MIN_QUERY_LENGTH ? (
        <View style={styles.centerBlock}>
          <Text style={styles.emptyText}>No matching places found.</Text>
        </View>
      ) : (
        <View style={styles.list} testID="change-location-results">
          {results.map((result, index) => (
            <Pressable
              key={`${result.latitude}-${result.longitude}-${index}`}
              onPress={() => setSelected(result)}
              testID={`change-location-result-${index}`}
              style={({ pressed }) => [
                styles.resultRow,
                pressed && styles.resultRowPressed,
              ]}
            >
              <MapPin size={layout.iconSize.sm} color={colors.textMuted} />
              <View style={styles.resultTextWrap}>
                <Text style={styles.resultTitle} numberOfLines={1}>
                  {result.city ?? result.displayName}
                </Text>
                <Text style={styles.resultSubtitle} numberOfLines={1}>
                  {result.displayName}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
};

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
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
  },
  resetText: {
    flex: 1,
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    height: layout.inputHeight,
    borderWidth: 0.8,
    borderColor: colors.borderSubtle,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    padding: 0,
  },
  centerBlock: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  resultRowPressed: {
    backgroundColor: colors.card,
  },
  resultTextWrap: {
    flex: 1,
  },
  resultTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  resultSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing['2xs'],
  },
  map: {
    flex: 1,
  },
  previewFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  previewTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  previewSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing['2xs'],
    marginBottom: spacing.md,
  },
  confirmBtn: {
    height: layout.buttonHeight,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    ...typography.button,
    color: colors.white,
  },
});
