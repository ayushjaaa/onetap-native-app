jest.mock('@/services/secureStorage');

import { createTestStore } from '@/test-utils/renderWithProviders';
import { productsApi } from '@/api/productsApi';

const originalFetch = globalThis.fetch;

function mockFetchOnce(status: number, body: unknown) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone() {
      return this;
    },
  }) as unknown as typeof fetch;
}

describe('productsApi', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('getFeed hits GET /marketplace/listings/feed with lat/lng and unwraps { data }', async () => {
    const listings = [
      {
        _id: 'l1',
        sellerId: 's1',
        title: 'iPhone 13',
        description: 'mint',
        price: 4200000,
        category: 'electronics-mobiles',
        condition: 'Like New',
        photos: [],
        location: { type: 'Point', coordinates: [72.8, 19.1] },
        status: 'Live',
        distanceMetres: 500,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    ];
    mockFetchOnce(200, {
      success: true,
      message: 'Feed retrieved',
      statusCode: 200,
      data: { listings, nextCursor: null, hasMore: false },
    });

    const store = createTestStore();
    const result = await store.dispatch(
      productsApi.endpoints.getFeed.initiate({ lat: 19.1, lng: 72.8 }),
    );

    const calledRequest = (globalThis.fetch as jest.Mock).mock
      .calls[0][0] as Request;
    expect(calledRequest.url).toContain('/marketplace/listings/feed');
    expect(calledRequest.url).toContain('lat=19.1');
    expect(calledRequest.url).toContain('lng=72.8');
    expect(calledRequest.method).toBe('GET');
    expect(result.data).toEqual({ listings, nextCursor: null, hasMore: false });
  });

  it('surfaces a backend error without throwing', async () => {
    mockFetchOnce(400, { message: 'lat and lng are required' });

    const store = createTestStore();
    const result = await store.dispatch(
      productsApi.endpoints.getFeed.initiate({ lat: 0, lng: 0 }),
    );

    expect(result.error).toBeDefined();
    expect((result.error as { status?: number })?.status).toBe(400);
  });

  it('createListing POSTs to /marketplace/listings and unwraps { data }', async () => {
    mockFetchOnce(201, {
      success: true,
      message: 'Listing submitted for review',
      statusCode: 201,
      data: { listing: { id: 'l1', status: 'Pending' } },
    });

    const store = createTestStore();
    const result = await store.dispatch(
      productsApi.endpoints.createListing.initiate({
        title: 'iPhone 13',
        description: 'mint condition, 128GB',
        price: 4200000,
        category: 'electronics-mobiles',
        condition: 'Like New',
        lat: 19.1,
        lng: 72.8,
      }),
    );

    const calledRequest = (globalThis.fetch as jest.Mock).mock
      .calls[0][0] as Request;
    expect(calledRequest.url).toContain('/marketplace/listings');
    expect(calledRequest.method).toBe('POST');
    expect(result.data).toEqual({ listing: { id: 'l1', status: 'Pending' } });
  });

  it('createListing surfaces a 422 slot-limit error without throwing', async () => {
    mockFetchOnce(422, { message: 'Slot limit reached' });

    const store = createTestStore();
    const result = await store.dispatch(
      productsApi.endpoints.createListing.initiate({
        title: 'iPhone 13',
        description: 'mint condition, 128GB',
        price: 4200000,
        category: 'electronics-mobiles',
        condition: 'Like New',
        lat: 19.1,
        lng: 72.8,
      }),
    );

    expect(result.error).toBeDefined();
    expect((result.error as { status?: number })?.status).toBe(422);
  });

  it('getMyListings hits GET /marketplace/listings/mine and unwraps { data }', async () => {
    const payload = {
      listings: [],
      summary: {
        total: 0,
        active: 0,
        postSlots: 3,
        slotsUsed: 0,
        slotsRemaining: 3,
        kycStatus: 'pending',
      },
    };
    mockFetchOnce(200, {
      success: true,
      message: 'Seller listings retrieved',
      statusCode: 200,
      data: payload,
    });

    const store = createTestStore();
    const result = await store.dispatch(
      productsApi.endpoints.getMyListings.initiate(),
    );

    const calledRequest = (globalThis.fetch as jest.Mock).mock
      .calls[0][0] as Request;
    expect(calledRequest.url).toContain('/marketplace/listings/mine');
    expect(calledRequest.method).toBe('GET');
    expect(result.data).toEqual(payload);
  });

  it('deleteListing DELETEs /marketplace/listings/:id and unwraps { data }', async () => {
    mockFetchOnce(200, {
      success: true,
      message: 'Listing deleted',
      statusCode: 200,
      data: { id: 'l1', status: 'Deleted' },
    });

    const store = createTestStore();
    const result = await store.dispatch(
      productsApi.endpoints.deleteListing.initiate('l1'),
    );

    const calledRequest = (globalThis.fetch as jest.Mock).mock
      .calls[0][0] as Request;
    expect(calledRequest.url).toContain('/marketplace/listings/l1');
    expect(calledRequest.method).toBe('DELETE');
    expect(result.data).toEqual({ id: 'l1', status: 'Deleted' });
  });
});
