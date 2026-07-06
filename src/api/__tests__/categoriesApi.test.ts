jest.mock('@/services/secureStorage');

import { createTestStore } from '@/test-utils/renderWithProviders';
import { categoriesApi } from '@/api/categoriesApi';

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

describe('categoriesApi', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('getCategoryTree hits GET /marketplace/categories and unwraps { data: { categories } }', async () => {
    const tree = [
      {
        id: 'vehicles',
        name: 'Vehicles',
        children: [{ id: 'vehicles-cars', name: 'Cars' }],
      },
    ];
    mockFetchOnce(200, {
      success: true,
      message: 'Category tree retrieved',
      data: { categories: tree },
      statusCode: 200,
    });

    const store = createTestStore();
    const result = await store.dispatch(
      categoriesApi.endpoints.getCategoryTree.initiate(),
    );

    const calledRequest = (globalThis.fetch as jest.Mock).mock
      .calls[0][0] as Request;
    expect(calledRequest.url).toContain('/marketplace/categories');
    expect(calledRequest.method).toBe('GET');
    expect(result.data).toEqual(tree);
  });

  it('getTopCategories hits GET /marketplace/categories/top and unwraps { data: { categories } }', async () => {
    const top = [{ id: 'vehicles', name: 'Vehicles' }];
    mockFetchOnce(200, {
      success: true,
      message: 'Top categories retrieved',
      data: { categories: top },
      statusCode: 200,
    });

    const store = createTestStore();
    const result = await store.dispatch(
      categoriesApi.endpoints.getTopCategories.initiate(),
    );

    const calledRequest = (globalThis.fetch as jest.Mock).mock
      .calls[0][0] as Request;
    expect(calledRequest.url).toContain('/marketplace/categories/top');
    expect(calledRequest.method).toBe('GET');
    expect(result.data).toEqual(top);
  });

  it('surfaces a backend error without throwing', async () => {
    mockFetchOnce(500, { message: 'Internal Server Error' });

    const store = createTestStore();
    const result = await store.dispatch(
      categoriesApi.endpoints.getCategoryTree.initiate(),
    );

    expect(result.error).toBeDefined();
    expect((result.error as { status?: number })?.status).toBe(500);
  });
});
