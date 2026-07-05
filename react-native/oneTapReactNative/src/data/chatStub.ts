// Stub chat threads shared by ChatConversationScreen (per-thread view) and
// ChatListScreen (inbox). Real backend will expose:
//   GET /chats              → list of threads with last message snippet
//   GET /chats/:id/messages → paginated message timeline
// keyed off the listingId (chat is always tied to a listing in v2).

export type DeliveryState = 'sending' | 'sent' | 'delivered';

export interface ChatMessage {
  id: string;
  authorId: string;
  body: string;
  atIso: string;
  delivery?: DeliveryState;
}

// id used to flip incoming-vs-outgoing rendering. Real check is against the
// authenticated user id from the auth slice; this constant matches
// listingsStub's STUB_CURRENT_SELLER_ID for consistency across stub data.
export const SELF_ID = 'self';

// Per-listing thread map. Keyed by listingId because v2 makes chat 1:1 with
// a listing — a buyer talks to a seller about a specific item, not in general.
export const STUB_THREADS: Record<string, ChatMessage[]> = {
  l2: [
    {
      id: 'm1',
      authorId: 'b_rohit',
      body: 'Hi, is the Activa still available?',
      atIso: '2026-05-17T10:30:00+05:30',
      delivery: 'delivered',
    },
    {
      id: 'm2',
      authorId: SELF_ID,
      body: 'Yes, available! Service paperwork ready hai.',
      atIso: '2026-05-17T10:32:00+05:30',
      delivery: 'delivered',
    },
    {
      id: 'm3',
      authorId: 'b_rohit',
      body: 'Aaj shaam dekhne aa sakta hoon?',
      atIso: '2026-05-17T10:33:00+05:30',
      delivery: 'delivered',
    },
  ],
  l3: [
    {
      id: 'm1',
      authorId: 'b_kunal',
      body: 'Bro kya price negotiable hai?',
      atIso: '2026-05-16T17:45:00+05:30',
      delivery: 'delivered',
    },
    {
      id: 'm2',
      authorId: SELF_ID,
      body: '1.2L tak aa sakte ho.',
      atIso: '2026-05-16T18:02:00+05:30',
      delivery: 'delivered',
    },
  ],
  l6: [
    {
      id: 'm1',
      authorId: 'b_priya',
      body: 'Sab bechna hai ya selective bhi de doge?',
      atIso: '2026-05-11T11:10:00+05:30',
      delivery: 'delivered',
    },
    {
      id: 'm2',
      authorId: SELF_ID,
      body: 'Bundle only — saath le lo deal ban jayegi.',
      atIso: '2026-05-11T11:30:00+05:30',
      delivery: 'delivered',
    },
    {
      id: 'm3',
      authorId: 'b_priya',
      body: 'Done. Kal pickup kar leta hoon.',
      atIso: '2026-05-12T09:05:00+05:30',
      delivery: 'delivered',
    },
  ],
  'demo-1': [
    {
      id: 'm1',
      authorId: 'other_rohit',
      body: 'Hey, this is still available. Let me know when you want to see it.',
      atIso: '2026-05-17T09:15:00+05:30',
      delivery: 'delivered',
    },
  ],
};

/**
 * Per-thread metadata that the inbox needs but the conversation view doesn't.
 * Real backend will return this on `GET /chats`.
 */
export interface StubThreadMeta {
  listingId: string;
  counterpartyId: string;
  counterpartyName: string;
  unreadCount: number;
}

export const STUB_THREAD_META: Record<string, StubThreadMeta> = {
  l2: {
    listingId: 'l2',
    counterpartyId: 'b_rohit',
    counterpartyName: 'Rohit S.',
    unreadCount: 1,
  },
  l3: {
    listingId: 'l3',
    counterpartyId: 'b_kunal',
    counterpartyName: 'Kunal D.',
    unreadCount: 0,
  },
  l6: {
    listingId: 'l6',
    counterpartyId: 'b_priya',
    counterpartyName: 'Priya M.',
    unreadCount: 0,
  },
  'demo-1': {
    listingId: 'demo-1',
    counterpartyId: 'other_rohit',
    counterpartyName: 'Rohit S.',
    unreadCount: 2,
  },
};

export const listStubThreads = (): StubThreadMeta[] =>
  Object.values(STUB_THREAD_META);

/**
 * Last message in a thread (or undefined if the thread is empty).
 * Returned shape is enough for the inbox row preview.
 */
export const lastMessageOf = (
  listingId: string,
): ChatMessage | undefined => {
  const msgs = STUB_THREADS[listingId];
  if (!msgs || msgs.length === 0) return undefined;
  return msgs[msgs.length - 1];
};
