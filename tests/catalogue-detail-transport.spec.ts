/**
 * S152 16b — Data store wire contract, faked at the transport (global fetch).
 *
 *  - The category list sends the ``category`` query param the public
 *    ``GET /api/v1/dataset`` reads (it sent ``category_slug``, which the API
 *    ignored, so every category listed every dataset).
 *  - A failed detail fetch shows "Dataset not found." (as the themed page
 *    does for any API error), never the raw ``GET … failed: 404`` text.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const { routeParams } = vi.hoisted(() => ({
  routeParams: { category_slug: 'env', dataset_slug: 'air-quality' } as Record<string, string>,
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: routeParams }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('vbwd-view-component', () => ({
  TagChips: { template: '<div />' },
  CustomFieldsDisplay: { template: '<div />' },
}));

vi.mock('../../cms', () => ({
  EntityPageContent: { template: '<div />' },
}));

import DatasetCatalogue from '../src/views/DatasetCatalogue.vue';
import DatasetDetail from '../src/views/DatasetDetail.vue';

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const EMPTY_PAGE = { items: [], total: 0, page: 1, per_page: 20, pages: 1 };

const requestedUrls: string[] = [];

function installFakeFetch(respond: (url: string) => { status: number; body: unknown }): void {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    requestedUrls.push(url);
    const { status, body } = respond(url);
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }));
}

const translate = (key: string) => (key === 'dataset.notFound' ? 'Dataset not found.' : key);
const mountOptions = { global: { mocks: { $t: translate }, stubs: { RouterLink: RouterLinkStub } } };

describe('Data store transport contract (S152 16b)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    requestedUrls.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('filters the list by the `category` param the public API reads', async () => {
    installFakeFetch((url) => ({
      status: HTTP_OK,
      body: url.includes('/categories') ? { categories: [] } : EMPTY_PAGE,
    }));
    mount(DatasetCatalogue, mountOptions);
    await flushPromises();

    const listUrl = requestedUrls.find((url) => url.startsWith('/api/v1/dataset?'));
    expect(listUrl).toBeDefined();
    const query = new URLSearchParams(listUrl!.split('?')[1]);
    expect(query.get('category')).toBe('env');
    expect(query.has('category_slug')).toBe(false);
  });

  it('shows "Dataset not found." instead of the raw fetch error', async () => {
    installFakeFetch(() => ({ status: HTTP_NOT_FOUND, body: { error: 'Dataset not found' } }));
    const wrapper = mount(DatasetDetail, mountOptions);
    await flushPromises();

    expect(requestedUrls).toEqual(['/api/v1/dataset/air-quality']);
    const errorText = wrapper.find('.dataset-error').text();
    expect(errorText).toBe('Dataset not found.');
    expect(errorText).not.toContain('failed');
  });
});
