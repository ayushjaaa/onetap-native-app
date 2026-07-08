import React, { useEffect, useState } from 'react';
import {
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
  Search as SearchIcon,
  X,
  Clock,
  TrendingUp,
} from 'lucide-react-native';
import { EmptyState, ListingCard } from '@/components/marketplace';
import { ShimmerCard } from '@/components/common/Shimmer';
import {
  useAutocompleteSearchQuery,
  useSearchListingsQuery,
} from '@/api/productsApi';
import { formatRelativeShort } from '@/data/listingsStub';
import { colors, fontSize, layout, radius, spacing } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';
import type { Listing } from '@/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const STUB_RECENT = ['iPhone 13', 'Honda Activa', '2 BHK Andheri', 'Sofa set'];
const STUB_TRENDING = [
  'iPhone 15',
  'Royal Enfield',
  'Plumber near me',
  'PS5',
  'Maid service',
];

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

const formatPricePaise = (paise: number): string =>
  `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

const toCardData = (listing: Listing) => ({
  id: listing._id,
  image: listing.photos[0],
  title: listing.title,
  price: formatPricePaise(listing.price),
  location: listing.address ?? '',
  time: formatRelativeShort(listing.createdAt),
  badge: listing.condition,
});

/** Debounces a fast-changing value so dependent queries don't fire per keystroke. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>(STUB_RECENT);
  // Distinguishes "still typing, show live suggestions" from "submitted,
  // show real results" — without this, inferring intent purely from debounce
  // timing means suggestions always flicker into results a moment after the
  // user stops typing, even if they never pressed search.
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;
  const isSubmitted = submittedQuery !== null && submittedQuery === trimmed;
  const debouncedQuery = useDebouncedValue(trimmed, DEBOUNCE_MS);
  const isQueryReady = debouncedQuery.length >= MIN_QUERY_LENGTH;

  const { data: searchData, isFetching: isSearching } = useSearchListingsQuery(
    { q: submittedQuery ?? '' },
    { skip: !isSubmitted },
  );
  const { data: autocompleteData } = useAutocompleteSearchQuery(
    debouncedQuery,
    { skip: !isQueryReady || isSubmitted },
  );

  const suggestions = autocompleteData?.suggestions ?? [];
  const showSuggestions = hasQuery && !isSubmitted && suggestions.length > 0;

  const results = searchData?.listings ?? [];
  const isLoadingResults = isSubmitted && isSearching;

  const handleSubmit = (term: string) => {
    const value = term.trim();
    if (!value) return;
    setRecent(prev => {
      const next = [value, ...prev.filter(r => r !== value)];
      return next.slice(0, 8);
    });
    setQuery(value);
    setSubmittedQuery(value);
  };

  const removeRecent = (term: string) => {
    setRecent(prev => prev.filter(r => r !== term));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search header */}
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <SearchIcon size={layout.iconSize.md} color={colors.primary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSubmit(query)}
            placeholder="Search products, services, jobs…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
            returnKeyType="search"
          />
          {hasQuery ? (
            <Pressable onPress={() => setQuery('')} hitSlop={spacing.sm}>
              <X size={layout.iconSize.md} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={navigation.goBack} hitSlop={spacing.md}>
          <Text style={styles.cancelBtn}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {hasQuery ? (
          showSuggestions && suggestions.length > 0 ? (
            <View style={styles.list}>
              {suggestions.map(term => (
                <Pressable
                  key={term}
                  onPress={() => handleSubmit(term)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <SearchIcon
                    size={layout.iconSize.sm}
                    color={colors.textMuted}
                  />
                  <Text style={styles.rowText}>{term}</Text>
                </Pressable>
              ))}
            </View>
          ) : isLoadingResults ? (
            <>
              <ShimmerCard />
              <ShimmerCard />
            </>
          ) : results.length === 0 ? (
            <EmptyState
              title={`No results for "${trimmed}"`}
              message="Try a different keyword or check your spelling."
            />
          ) : (
            results.map(item => {
              const card = toCardData(item);
              return (
                <ListingCard
                  key={card.id}
                  image={card.image}
                  title={card.title}
                  price={card.price}
                  location={card.location}
                  time={card.time}
                  badge={card.badge}
                  onPress={() =>
                    navigation.navigate('ListingDetail', {
                      listingId: card.id,
                      listing: item,
                    })
                  }
                />
              );
            })
          )
        ) : (
          <>
            {recent.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Clock size={layout.iconSize.sm} color={colors.textMuted} />
                    <Text style={styles.sectionTitle}>Recent</Text>
                  </View>
                  <Pressable onPress={() => setRecent([])} hitSlop={spacing.sm}>
                    <Text style={styles.clearText}>Clear</Text>
                  </Pressable>
                </View>
                <View style={styles.list}>
                  {recent.map(term => (
                    <Pressable
                      key={term}
                      onPress={() => handleSubmit(term)}
                      style={({ pressed }) => [
                        styles.row,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <Clock
                        size={layout.iconSize.sm}
                        color={colors.textMuted}
                      />
                      <Text style={styles.rowText}>{term}</Text>
                      <Pressable
                        onPress={() => removeRecent(term)}
                        hitSlop={spacing.sm}
                      >
                        <X size={layout.iconSize.sm} color={colors.textMuted} />
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <TrendingUp size={layout.iconSize.sm} color={colors.warning} />
                <Text style={styles.sectionTitle}>Trending searches</Text>
              </View>
              <View style={styles.chipWrap}>
                {STUB_TRENDING.map(term => (
                  <Pressable
                    key={term}
                    onPress={() => handleSubmit(term)}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>{term}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
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
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  cancelBtn: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
    flexGrow: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  clearText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  rowPressed: {
    backgroundColor: colors.card,
  },
  rowText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
  },
});
