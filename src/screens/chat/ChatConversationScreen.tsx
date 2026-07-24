import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  MoreVertical,
  Send,
  XCircle,
} from 'lucide-react-native';
import {
  findStubListing,
  formatRelativeShort,
  type StubListing,
  stubThumbColour,
} from '@/data/listingsStub';
import {
  type ChatMessage,
  type DeliveryState,
  SELF_ID,
  STUB_THREADS,
} from '@/data/chatStub';
import { formatINR } from '@/data/packagesCatalog';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ChatConversation'>;
type Props = NativeStackScreenProps<MainStackParamList, 'ChatConversation'>;

const QUICK_REPLIES = [
  'Is it still available?',
  "What's your best price?",
  'Can we meet today?',
];

const sameDay = (a: string, b: string): boolean => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

const formatDayLabel = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (sameDay(d.toISOString(), today.toISOString())) return 'Today';
  if (sameDay(d.toISOString(), yest.toISOString())) return 'Yesterday';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

const formatTimeLabel = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
};

// ---- Screen -----------------------------------------------------------------

export const ChatConversationScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<Nav>();
  const { listingId, counterpartyId, counterpartyName } = route.params;

  const listing = findStubListing(listingId);
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => STUB_THREADS[listingId] ?? [],
  );
  const [draft, setDraft] = useState('');

  // Online presence is mocked: pretend the counterparty is online iff their
  // id ends with an odd char. Cheap deterministic stand-in for socket data.
  // Must run before the `!listing` early return below (Rules of Hooks), so
  // it tolerates a null listing itself rather than being skipped.
  const isOnline = useMemo(() => {
    const key = counterpartyId ?? listing?.seller.id;
    if (!key) return false;
    return key.charCodeAt(key.length - 1) % 2 === 1;
  }, [counterpartyId, listing?.seller.id]);

  // Defensive: chat without a known listing shouldn't crash.
  if (!listing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centeredError}>
          <XCircle size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Conversation not found</Text>
          <Text style={styles.errorBody}>
            This listing may have been removed. Try opening the chat from your
            inbox again.
          </Text>
          <Pressable
            style={styles.errorPrimary}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorPrimaryText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const resolvedName = counterpartyName ?? listing.seller.name;
  const resolvedInitial = resolvedName.charAt(0).toUpperCase();
  const isUnavailable = listing.status === 'sold';

  const sendMessage = (body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      authorId: SELF_ID,
      body: trimmed,
      atIso: new Date().toISOString(),
      delivery: 'sending',
    };
    setMessages(prev => [...prev, optimistic]);
    setDraft('');

    // Mock the socket round-trip. Real client publishes via socket.emit
    // and updates delivery on ack.
    setTimeout(() => {
      setMessages(prev =>
        prev.map(m =>
          m.id === optimistic.id ? { ...m, delivery: 'delivered' } : m,
        ),
      );
    }, 300);
  };

  const handleSendTap = () => sendMessage(draft);

  const handleQuickReply = (text: string) => sendMessage(text);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={navigation.goBack}
            hitSlop={spacing.md}
            style={styles.backBtn}
          >
            <ChevronLeft size={layout.iconSize.lg} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{resolvedInitial}</Text>
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName} numberOfLines={1}>
              {resolvedName}
            </Text>
            <View style={styles.presenceRow}>
              <View
                style={[
                  styles.presenceDot,
                  isOnline ? styles.presenceOnline : styles.presenceOffline,
                ]}
              />
              <Text style={styles.presenceText}>
                {isOnline ? 'online' : 'offline'}
              </Text>
            </View>
          </View>
          <Pressable hitSlop={spacing.md} style={styles.menuBtn}>
            <MoreVertical
              size={layout.iconSize.md}
              color={colors.textPrimary}
            />
          </Pressable>
        </View>

        {/* Pinned listing context card */}
        <PinnedListingCard
          listing={listing}
          onPress={() =>
            navigation.navigate('ListingDetail', {
              listingId: listing.id,
            })
          }
        />

        {/* Conversation */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <EmptyConversation
              counterpartyName={resolvedName}
              onPick={handleQuickReply}
            />
          ) : (
            <ConversationList
              messages={messages}
              counterpartyName={resolvedName}
            />
          )}
        </ScrollView>

        {/* Sold notice */}
        {isUnavailable ? (
          <View style={styles.soldBanner}>
            <Text style={styles.soldBannerText}>
              This product has been sold. You can still chat for follow-up.
            </Text>
          </View>
        ) : null}

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={1000}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={handleSendTap}
            disabled={draft.trim().length === 0}
            style={({ pressed }) => [
              styles.sendBtn,
              draft.trim().length === 0 && styles.sendBtnDisabled,
              pressed && styles.sendBtnPressed,
            ]}
            accessibilityLabel="Send message"
          >
            <Send size={layout.iconSize.md} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ---- Subcomponents ----------------------------------------------------------

const PinnedListingCard: React.FC<{
  listing: StubListing;
  onPress: () => void;
}> = ({ listing, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.pinnedCard,
      pressed && styles.pinnedCardPressed,
    ]}
  >
    <View
      style={[
        styles.pinnedThumb,
        { backgroundColor: stubThumbColour(listing.id) },
      ]}
    />
    <View style={styles.pinnedText}>
      <Text style={styles.pinnedTitle} numberOfLines={1}>
        {listing.title}
      </Text>
      <View style={styles.pinnedMetaRow}>
        <Text style={styles.pinnedPrice}>
          {formatINR(listing.priceInPaise)}
        </Text>
        <StatusPill status={listing.status} />
      </View>
    </View>
    <ChevronRight size={layout.iconSize.md} color={colors.textMuted} />
  </Pressable>
);

const StatusPill: React.FC<{ status: StubListing['status'] }> = ({
  status,
}) => {
  const cfg = STATUS_PILL_CFG[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusPillText, { color: cfg.fg }]}>
        {cfg.label}
      </Text>
    </View>
  );
};

const STATUS_PILL_CFG: Record<
  StubListing['status'],
  { label: string; bg: string; fg: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'rgba(245, 158, 11, 0.18)',
    fg: colors.warning,
  },
  live: { label: 'Live', bg: 'rgba(16, 185, 129, 0.18)', fg: colors.success },
  rejected: {
    label: 'Rejected',
    bg: 'rgba(239, 68, 68, 0.18)',
    fg: colors.error,
  },
  sold: { label: 'Sold', bg: colors.card, fg: colors.textMuted },
};

interface ConversationListProps {
  messages: ChatMessage[];
  counterpartyName: string;
}

const ConversationList: React.FC<ConversationListProps> = ({
  messages,
  counterpartyName,
}) => {
  const blocks: Array<
    | { kind: 'date'; key: string; label: string }
    | { kind: 'msg'; msg: ChatMessage }
  > = [];

  let lastIso: string | null = null;
  for (const msg of messages) {
    if (!lastIso || !sameDay(lastIso, msg.atIso)) {
      blocks.push({
        kind: 'date',
        key: `d-${msg.id}`,
        label: formatDayLabel(msg.atIso),
      });
    }
    blocks.push({ kind: 'msg', msg });
    lastIso = msg.atIso;
  }

  return (
    <View style={styles.conversation}>
      {blocks.map(block => {
        if (block.kind === 'date') {
          return (
            <View key={block.key} style={styles.dateDividerWrap}>
              <View style={styles.dateDividerLine} />
              <Text style={styles.dateDividerText}>{block.label}</Text>
              <View style={styles.dateDividerLine} />
            </View>
          );
        }
        const { msg } = block;
        const isSelf = msg.authorId === SELF_ID;
        return (
          <View
            key={msg.id}
            style={[
              styles.bubbleRow,
              isSelf ? styles.bubbleRowSelf : styles.bubbleRowOther,
            ]}
          >
            <View
              style={[
                styles.bubble,
                isSelf ? styles.bubbleSelf : styles.bubbleOther,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  isSelf ? styles.bubbleTextSelf : styles.bubbleTextOther,
                ]}
              >
                {msg.body}
              </Text>
              <View style={styles.bubbleMetaRow}>
                <Text
                  style={[
                    styles.bubbleTime,
                    isSelf ? styles.bubbleTimeSelf : styles.bubbleTimeOther,
                  ]}
                >
                  {formatTimeLabel(msg.atIso)}
                </Text>
                {isSelf ? <DeliveryIcon state={msg.delivery} /> : null}
              </View>
            </View>
            {!isSelf ? (
              <Text style={styles.bubbleAuthor} numberOfLines={1}>
                {counterpartyName}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

const DeliveryIcon: React.FC<{ state?: DeliveryState }> = ({ state }) => {
  if (state === 'sending') {
    return <Clock size={12} color="rgba(255,255,255,0.7)" />;
  }
  if (state === 'sent') {
    return <Check size={12} color="rgba(255,255,255,0.7)" />;
  }
  // delivered (and the default for older stubs)
  return <CheckCheck size={12} color="rgba(255,255,255,0.85)" />;
};

interface EmptyConversationProps {
  counterpartyName: string;
  onPick: (text: string) => void;
}

const EmptyConversation: React.FC<EmptyConversationProps> = ({
  counterpartyName,
  onPick,
}) => (
  <View style={styles.emptyWrap}>
    <Text style={styles.emptyTitle}>Say hi to {counterpartyName}</Text>
    <Text style={styles.emptySub}>Quick replies:</Text>
    <View style={styles.quickRow}>
      {QUICK_REPLIES.map(text => (
        <Pressable
          key={text}
          onPress={() => onPick(text)}
          style={({ pressed }) => [
            styles.quickChip,
            pressed && styles.quickChipPressed,
          ]}
        >
          <Text style={styles.quickChipText}>{text}</Text>
        </Pressable>
      ))}
    </View>
    <Text style={styles.emptyHint}>
      First message sent · {formatRelativeShort(new Date().toISOString())}
    </Text>
  </View>
);

// ---- Styles -----------------------------------------------------------------

const AVATAR = 40;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
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
    ...typography.bodyBold,
    color: colors.primary,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  presenceOnline: {
    backgroundColor: colors.success,
  },
  presenceOffline: {
    backgroundColor: colors.textMuted,
  },
  presenceText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  menuBtn: {
    width: layout.closeButton,
    height: layout.closeButton,
    borderRadius: layout.closeButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pinned listing card
  pinnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pinnedCardPressed: {
    backgroundColor: colors.card,
  },
  pinnedThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
  },
  pinnedText: {
    flex: 1,
  },
  pinnedTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  pinnedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing['2xs'],
  },
  pinnedPrice: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusPillText: {
    fontSize: fontSize['2xs'],
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Conversation
  scrollContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  conversation: {
    gap: spacing.md,
  },

  dateDividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dateDividerText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },

  bubbleRow: {
    maxWidth: '85%',
  },
  bubbleRowSelf: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleRowOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  bubbleSelf: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.xs,
  },
  bubbleOther: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: radius.xs,
  },
  bubbleText: {
    ...typography.body,
    lineHeight: fontSize.base * 1.4,
  },
  bubbleTextSelf: {
    color: colors.white,
  },
  bubbleTextOther: {
    color: colors.textPrimary,
  },
  bubbleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing['2xs'],
    alignSelf: 'flex-end',
  },
  bubbleTime: {
    fontSize: fontSize['2xs'],
  },
  bubbleTimeSelf: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bubbleTimeOther: {
    color: colors.textMuted,
  },
  bubbleAuthor: {
    fontSize: fontSize['2xs'],
    color: colors.textMuted,
    marginTop: spacing['2xs'],
    marginLeft: spacing.xs,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  quickChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
  },
  quickChipPressed: {
    opacity: 0.85,
  },
  quickChipText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textDisabled,
    marginTop: spacing.md,
  },

  // Sold banner
  soldBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  soldBannerText: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minHeight: layout.inputHeight - 8,
    maxHeight: 120,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: fontSize.base,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.primaryAlpha30,
  },
  sendBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },

  // Error frame
  centeredError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.base,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  errorBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorPrimary: {
    marginTop: spacing.lg,
    height: layout.buttonHeight,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorPrimaryText: {
    ...typography.button,
    color: colors.white,
  },
});
