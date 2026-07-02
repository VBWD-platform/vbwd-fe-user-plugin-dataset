import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';

const mockGetMeta = vi.fn();
const mockGetPreview = vi.fn();
const mockFetchKeys = vi.fn();
const mockDownload = vi.fn();
const mockListSnapshots = vi.fn();
const mockDownloadSnapshot = vi.fn();

vi.mock('../src/api/datasetApi', () => ({
  datasetApi: {
    getMeta: (...args: unknown[]) => mockGetMeta(...args),
    getPreview: (...args: unknown[]) => mockGetPreview(...args),
    dataUrl: (slug: string) => `/api/v1/dataset/${slug}/data`,
    downloadUrl: (slug: string) => `/api/v1/dataset/${slug}/download`,
    download: (...args: unknown[]) => mockDownload(...args),
    listSnapshots: (...args: unknown[]) => mockListSnapshots(...args),
    downloadSnapshot: (...args: unknown[]) => mockDownloadSnapshot(...args),
  },
}));

// The access page reads the caller's own API keys from the core self-service
// store; stub it so the component mounts without the app's pinia/API.
const apiKeysState = {
  keys: [
    { id: 'k1', label: 'CI key', key_prefix: 'vbwd_ab12', scopes: ['dataset:read'], ip_whitelist: [], is_active: true },
    { id: 'k2', label: 'Other', key_prefix: 'vbwd_zz99', scopes: ['user:read'], ip_whitelist: [], is_active: true },
  ],
  fetchKeys: mockFetchKeys,
};
vi.mock('@/stores/apiKeys', () => ({
  useApiKeysStore: () => apiKeysState,
}));

import DatasetAccessDetail from '../src/components/DatasetAccessDetail.vue';

const tFallback = (key: string) => key;

function makeRows(count: number): Array<Array<string | number | null>> {
  return Array.from({ length: count }, (_unused, index) => [index, `city-${index}`, index * 2]);
}

async function mountAccess() {
  const wrapper = mount(DatasetAccessDetail, {
    props: { slug: 'air-quality' },
    global: {
      mocks: { $t: tFallback },
      stubs: { RouterLink: RouterLinkStub },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('DatasetAccessDetail — API URL + download + metadata + capped preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchKeys.mockResolvedValue(undefined);
    mockGetMeta.mockResolvedValue({
      slug: 'air-quality',
      taken_at: '2026-06-30-12-00',
      source: 'European Environment Agency',
      size_bytes: 20480,
      checksum: 'sha256:abcd',
      attribution: 'CC-BY 4.0',
    });
    mockGetPreview.mockResolvedValue({
      columns: ['id', 'city', 'value'],
      rows: makeRows(150),
    });
    mockListSnapshots.mockResolvedValue([]);
  });

  it('shows the user key carrying the dataset:read scope (no standalone scoped-URL line)', async () => {
    const wrapper = await mountAccess();

    // The redundant scoped-URL code line was removed — the API examples section
    // now carries every URL. The key card stays at the top.
    expect(wrapper.find('[data-testid="dataset-access-api-url"]').exists()).toBe(false);

    const keys = wrapper.findAll('[data-testid="dataset-access-api-key"]');
    expect(keys).toHaveLength(1);
    expect(keys[0].text()).toContain('vbwd_ab12');
  });

  it('places the API examples section right after the key card (position 1)', async () => {
    const wrapper = await mountAccess();
    const cards = wrapper.findAll('.vbwd-card');
    // Card 0 = the API-key card; card 1 = the API usage examples.
    expect(cards[1].attributes('data-testid')).toBe('dataset-api-examples');
  });

  it('downloads the snapshot as an auth-carrying blob (not a bare anchor)', async () => {
    mockDownload.mockResolvedValue({ blob: new Blob(['a,b\n1,2']), filename: 'air-quality.csv' });
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const wrapper = await mountAccess();
    const download = wrapper.find('[data-testid="dataset-access-download"]');
    expect(download.element.tagName).toBe('BUTTON');
    await download.trigger('click');
    await flushPromises();

    expect(mockDownload).toHaveBeenCalledWith('air-quality');
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('renders the issue metadata block', async () => {
    const wrapper = await mountAccess();
    const metaBlock = wrapper.find('[data-testid="dataset-access-meta"]');
    expect(metaBlock.exists()).toBe(true);
    expect(metaBlock.text()).toContain('European Environment Agency');
    expect(metaBlock.text()).toContain('sha256:abcd');
  });

  it('renders the preview grid capped at 100 rows even when more are returned', async () => {
    const wrapper = await mountAccess();
    const grid = wrapper.find('[data-testid="dataset-preview-grid"]');
    expect(grid.exists()).toBe(true);
    const rows = wrapper.findAll('[data-testid="dataset-preview-row"]');
    expect(rows.length).toBe(100);
  });
});
