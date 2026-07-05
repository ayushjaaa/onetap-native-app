import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, MessageCircle } from 'lucide-react-native';
import { EmptyState } from '@/components/marketplace';
import { lastMessageOf, listStubThreads, SELF_ID } from '@/data/chatStub';
import {
  findStubListing,
  formatRelativeShort,
  stubThumbColour,
} from '@/data/listingsStub';
import {
  colors,
  fontSize,
  layout,
  radius,
  spacing,
  typography,
} from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ChatList'>;

type ChatTab = 'all' | 'active' | 'sold';

const TABS: Array<{ key: ChatTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'sold', label: 'Sold' },
];

interface ChatRow {
  listingId: string;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyInitial: string;
  listingTitle: string;
  listingStatus: 'pending' | 'live' | 'rejected' | 'sold';
  lastSnippet: string;
  lastAtIso: string;
  lastFromSelf: boolean;
  unreadCount: number;
}

const buildRows = (): ChatRow[] => {
  const rows: ChatRow[] = [];
  for (const meta of listStubThreads()) {
    const listing = findStubListing(meta.listingId);
    const last = lastMessageOf(meta.listingId);
    if (!listing || !last) continue;
    rows.push({
      listingId: meta.listingId,
      counterpartyId: meta.counterpartyId,
      counterpartyName: meta.counterpartyName,
      counterpartyInitial: meta.counterpartyName.charAt(0).toUpperCase(),
      listingTitle: listing.title,
      listingStatus: listing.status,
      lastSnippet: last.body,
      lastAtIso: last.atIso,
      lastFromSelf: last.authorId === SELF_ID,
      unreadCount: meta.unreadCount,
    });
  }
  // Unread first, then by most recent.
  rows.sort((a, b) => {
    if ((a.unreadCount > 0 ? 1 : 0) !== (b.unreadCount > 0 ? 1 : 0)) {
      return b.unreadCount > 0 ? 1 : -1;
    }
    return new Date(b.lastAtIso).getTime() - new Date(a.lastAtIso).getTime();
  });
  return rows;
};

export const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<ChatTab>('all');

  const allRows = useMemo(() => buildRows(), []);

  const counts = useMemo(() => {
    const active = allRows.filter(r => r.listingStatus !== 'sold').length;
    const sold = allRows.filter(r => r.listingStatus === 'sold').length;
    return { all: allRows.length, active, sold };
  }, [allRows]);

  const visible = useMemo(() => {
    if (activeTab === 'active') {
      return allRows.filter(r => r.listingStatus !== 'sold');
    }
    if (activeTab === 'sold') {
      return allRows.filter(r => r.listingStatus === 'sold');
    }
    return allRows;
  }, [allRows, activeTab]);

  const handleOpen = (row: ChatRow) => {
    navigation.navigate('ChatConversation', {
      listingId: row.listingId,
      counterpartyId: row.counterpartyId,
      counterpartyName: row.counterpartyName,
    });
  };

  const handleBrowse = () => {
    // Pop to the Tabs stack and land on Home where the feed lives.
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
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabsRow}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const count = counts[tab.key];
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, isActive && styles.tabActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[styles.tabText, isActive && styles.tabTextActive]}
              >
                {tab.label}
                {count > 0 ? ` · ${count}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          visible.length === 0 && styles.scrollContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={
              activeTab === 'sold'
                ? 'No sold conversations'
                : activeTab === 'active'
                  ? 'No active conversations'
                  : 'No conversations yet'
            }
            message={
              activeTab === 'all'
                ? 'Aapke saare chats yahaan dikhayi denge.'
                : 'Iss filter par koi chat nahi.'
            }
            actionLabel={activeTab === 'all' ? 'Browse listings' : undefined}
            onActionPress={activeTab === 'all' ? handleBrowse : undefined}
          />
        ) : (
          visible.map(row => <ChatRow key={row.listingId} row={row} onPress={() => handleOpen(row)} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ---- Subcomponents ----------------------------------------------------------

interface ChatRowComponentProps {
  row: ChatRow;
  onPress: () => void;
}

const ChatRow: React.FC<ChatRowComponentProps> = ({ row, onPress }) => {
  const isUnread = row.unreadCount > 0;
  const snippetPrefix = row.lastFromSelf ? 'You: ' : '';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{row.counterpartyInitial}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTopLine}>
          <Text
            style={[styles.rowName, isUnread && styles.rowNameUnread]}
            numberOfLines={1}
          >
            {row.counterpartyName}
          </Text>
          <Text
            style={[styles.rowTime, isUnread && styles.rowTimeUnread]}
          >
            {formatRelativeShort(row.lastAtIso)}
          </Text>
        </View>
        <View style={styles.rowBottomLine}>
          <Text
            style={[styles.rowSnippet, isUnread && styles.rowSnippetUnread]}
            numberOfLines={1}
          >
            {snippetPrefix}
            {row.lastSnippet}
          </Text>
          {isUnread ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{row.unreadCount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.rowListing} numberOfLines={1}>
          On: {row.listingTitle}
        </Text>
      </View>
      <View
        style={[
          styles.listingThumb,
          { backgroundColor: stubThumbColour(row.listingId) },
          row.listingStatus === 'sold' && styles.listingThumbDim,
        ]}
      />
    </Pressable>
  );
};

// ---- Styles -----------------------------------------------------------------

const AVATAR = 48;
const THUMB = 44;

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
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  headerSpacer: {
    width: layout.closeButton,
  },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.sm,
  },
  scrollContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rowPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.997 }],
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.primaryAlpha15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.h4,
    color: colors.primary,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowName: {
    flex: 1,
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  rowNameUnread: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  rowTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rowTimeUnread: {
    color: colors.primary,
    fontWeight: '700',
  },
  rowBottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing['2xs'],
  },
  rowSnippet: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
  },
  rowSnippetUnread: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: fontSize['2xs'],
    fontWeight: '800',
    color: colors.white,
  },
  rowListing: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing['2xs'],
    fontSize: fontSize.xs,
  },
  listingThumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.sm,
  },
  listingThumbDim: {
    opacity: 0.5,
  },
});
