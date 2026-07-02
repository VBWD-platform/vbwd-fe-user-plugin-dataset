import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import type { DatasetSnapshot } from '../src/api/datasetApi';

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

const apiKeysState = {
  keys: [] as unknown[],
  fetchKeys: mockFetchKeys,
};
vi.mock('@/stores/apiKeys', () => ({
  useApiKeysStore: () => apiKeysState,
}));

import DatasetAccessDetail from '../src/components/DatasetAccessDetail.vue';

const tFallback = (key: string) => key;

function makeSnapshot(index: number, overrides: Partial<DatasetSnapshot> = {}): DatasetSnapshot {
  const day = String((index % 27) + 1).padStart(2, '0');
  return {
    id: `snap-${index}`,
    taken_at: `2026-06-${day}T08:00:00Z`,
    size_bytes: (index + 1) * 1024,
    ext: 'csv',
    checksum: `sha256:${index}`,
    storage_backend: index % 2 === 0 ? 'local' : 's3',
    is_last: false,
    ...overrides,
  };
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

describe('DatasetAccessDetail — archive table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchKeys.mockResolvedValue(undefined);
    mockGetMeta.mockResolvedValue(null);
    mockGetPreview.mockResolvedValue({ columns: [], rows: [] });
    mockListSnapshots.mockResolvedValue([]);
  });

  it('renders a row per snapshot from listSnapshots(slug)', async () => {
    mockListSnapshots.mockResolvedValue([makeSnapshot(0), makeSnapshot(1), makeSnapshot(2)]);
    const wrapper = await mountAccess();

    expect(mockListSnapshots).toHaveBeenCalledWith('air-quality');
    const archive = wrapper.find('[data-testid="dataset-archive"]');
    expect(archive.exists()).toBe(true);
    const rows = wrapper.findAll('[data-testid="dataset-archive-row"]');
    expect(rows.length).toBe(3);
  });

  it('flags the is_last snapshot with a "last" badge', async () => {
    mockListSnapshots.mockResolvedValue([
      makeSnapshot(0, { is_last: true }),
      makeSnapshot(1),
    ]);
    const wrapper = await mountAccess();
    const badges = wrapper.findAll('[data-testid="dataset-archive-last-badge"]');
    expect(badges.length).toBe(1);
  });

  it('shows an empty state when there are no snapshots', async () => {
    mockListSnapshots.mockResolvedValue([]);
    const wrapper = await mountAccess();
    expect(wrapper.find('[data-testid="dataset-archive-empty"]').exists()).toBe(true);
  });

  it('shows an error state and does not crash when listSnapshots rejects', async () => {
    mockListSnapshots.mockRejectedValue(new Error('boom'));
    const wrapper = await mountAccess();
    expect(wrapper.find('[data-testid="dataset-archive-error"]').exists()).toBe(true);
  });

  it('sorts by taken_at (default desc / newest first) and toggles on header click', async () => {
    // Deliberately out of order.
    mockListSnapshots.mockResolvedValue([
      makeSnapshot(0, { id: 'old', taken_at: '2026-06-01T08:00:00Z' }),
      makeSnapshot(1, { id: 'new', taken_at: '2026-06-20T08:00:00Z' }),
      makeSnapshot(2, { id: 'mid', taken_at: '2026-06-10T08:00:00Z' }),
    ]);
    const wrapper = await mountAccess();

    let rows = wrapper.findAll('[data-testid="dataset-archive-row"]');
    // Default: newest first.
    expect(rows[0].text()).toContain('2026-06-20');
    expect(rows[2].text()).toContain('2026-06-01');

    await wrapper.find('[data-testid="dataset-archive-sort-taken_at"]').trigger('click');
    await flushPromises();
    rows = wrapper.findAll('[data-testid="dataset-archive-row"]');
    // Toggled: oldest first.
    expect(rows[0].text()).toContain('2026-06-01');
    expect(rows[2].text()).toContain('2026-06-20');
  });

  it('sorts by size when the size header is clicked', async () => {
    mockListSnapshots.mockResolvedValue([
      makeSnapshot(0, { id: 'big', size_bytes: 5000, taken_at: '2026-06-01T08:00:00Z' }),
      makeSnapshot(1, { id: 'small', size_bytes: 100, taken_at: '2026-06-02T08:00:00Z' }),
    ]);
    const wrapper = await mountAccess();

    await wrapper.find('[data-testid="dataset-archive-sort-size"]').trigger('click');
    await flushPromises();
    const rows = wrapper.findAll('[data-testid="dataset-archive-row"]');
    // First size click → ascending (smallest first): 100 B before 5000 B.
    expect(rows[0].text()).toContain('100 B');
    expect(rows[1].text()).toContain('4.9 KB');
  });

  it('quicksearches case-insensitively over taken_at and backend', async () => {
    mockListSnapshots.mockResolvedValue([
      makeSnapshot(0, { id: 'a', storage_backend: 'local', taken_at: '2026-06-01T08:00:00Z' }),
      makeSnapshot(1, { id: 'b', storage_backend: 's3', taken_at: '2026-06-02T08:00:00Z' }),
    ]);
    const wrapper = await mountAccess();

    const search = wrapper.find('[data-testid="dataset-archive-search"]');
    await search.setValue('S3');
    await flushPromises();
    const rows = wrapper.findAll('[data-testid="dataset-archive-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0].text()).toContain('s3');
  });

  it('paginates at page size 10 and moves between pages', async () => {
    const snapshots = Array.from({ length: 23 }, (_unused, index) =>
      makeSnapshot(index, { taken_at: `2026-06-${String(index + 1).padStart(2, '0')}T08:00:00Z` }),
    );
    mockListSnapshots.mockResolvedValue(snapshots);
    const wrapper = await mountAccess();

    expect(wrapper.findAll('[data-testid="dataset-archive-row"]').length).toBe(10);
    expect(wrapper.find('[data-testid="dataset-archive-page"]').text()).toContain('3');

    await wrapper.find('[data-testid="dataset-archive-next"]').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('[data-testid="dataset-archive-row"]').length).toBe(10);

    await wrapper.find('[data-testid="dataset-archive-next"]').trigger('click');
    await flushPromises();
    // Last page: 23 - 20 = 3 rows.
    expect(wrapper.findAll('[data-testid="dataset-archive-row"]').length).toBe(3);

    await wrapper.find('[data-testid="dataset-archive-prev"]').trigger('click');
    await flushPromises();
    expect(wrapper.findAll('[data-testid="dataset-archive-row"]').length).toBe(10);
  });

  it('resets to page 1 when the search changes', async () => {
    const snapshots = Array.from({ length: 23 }, (_unused, index) =>
      makeSnapshot(index, {
        storage_backend: 'local',
        taken_at: `2026-06-${String(index + 1).padStart(2, '0')}T08:00:00Z`,
      }),
    );
    mockListSnapshots.mockResolvedValue(snapshots);
    const wrapper = await mountAccess();

    await wrapper.find('[data-testid="dataset-archive-next"]').trigger('click');
    await flushPromises();
    await wrapper.find('[data-testid="dataset-archive-search"]').setValue('local');
    await flushPromises();
    expect(wrapper.find('[data-testid="dataset-archive-page"]').text()).toContain('1');
  });

  it('downloads a single row via downloadSnapshot + object-URL anchor', async () => {
    mockListSnapshots.mockResolvedValue([makeSnapshot(0, { id: 'snap-x' })]);
    mockDownloadSnapshot.mockResolvedValue({ blob: new Blob(['x']), filename: 'snap-x.csv' });
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const wrapper = await mountAccess();
    await wrapper.find('[data-testid="dataset-archive-download"]').trigger('click');
    await flushPromises();

    expect(mockDownloadSnapshot).toHaveBeenCalledWith('air-quality', 'snap-x');
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('bulk-downloads each selected snapshot', async () => {
    mockListSnapshots.mockResolvedValue([
      makeSnapshot(0, { id: 'snap-a', taken_at: '2026-06-03T08:00:00Z' }),
      makeSnapshot(1, { id: 'snap-b', taken_at: '2026-06-02T08:00:00Z' }),
      makeSnapshot(2, { id: 'snap-c', taken_at: '2026-06-01T08:00:00Z' }),
    ]);
    mockDownloadSnapshot.mockResolvedValue({ blob: new Blob(['x']), filename: 'f.csv' });
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const wrapper = await mountAccess();
    const bulk = wrapper.find('[data-testid="dataset-archive-bulk"]');
    // Disabled with nothing selected.
    expect((bulk.element as HTMLButtonElement).disabled).toBe(true);

    const checkboxes = wrapper.findAll('[data-testid="dataset-archive-select"]');
    await checkboxes[0].setValue(true);
    await checkboxes[2].setValue(true);
    await flushPromises();

    expect((wrapper.find('[data-testid="dataset-archive-bulk"]').element as HTMLButtonElement).disabled).toBe(false);
    await wrapper.find('[data-testid="dataset-archive-bulk"]').trigger('click');
    await flushPromises();

    expect(mockDownloadSnapshot).toHaveBeenCalledTimes(2);
    expect(mockDownloadSnapshot).toHaveBeenCalledWith('air-quality', 'snap-a');
    expect(mockDownloadSnapshot).toHaveBeenCalledWith('air-quality', 'snap-c');

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('select-all toggles the current page rows', async () => {
    mockListSnapshots.mockResolvedValue([makeSnapshot(0), makeSnapshot(1)]);
    const wrapper = await mountAccess();

    await wrapper.find('[data-testid="dataset-archive-select-all"]').setValue(true);
    await flushPromises();
    expect((wrapper.find('[data-testid="dataset-archive-bulk"]').element as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('DatasetAccessDetail — API usage examples', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchKeys.mockResolvedValue(undefined);
    mockGetMeta.mockResolvedValue(null);
    mockGetPreview.mockResolvedValue({ columns: [], rows: [] });
    mockListSnapshots.mockResolvedValue([]);
  });

  it('renders 3 snippets with the correct URLs and X-API-Key by default (curl)', async () => {
    const wrapper = await mountAccess();
    const examples = wrapper.find('[data-testid="dataset-api-examples"]');
    expect(examples.exists()).toBe(true);

    const snippets = wrapper.findAll('[data-testid="dataset-example-snippet"]');
    expect(snippets.length).toBe(3);

    const text = examples.text();
    expect(text).toContain('/api/v1/dataset/air-quality/data');
    expect(text).toContain('/api/v1/dataset/air-quality/snapshots');
    expect(text).toContain('/api/v1/dataset/air-quality/snapshots/SNAPSHOT_ID/download');
    expect(text).toContain('X-API-Key: YOUR_API_KEY');
    expect(text).toContain('curl');
  });

  it('switches snippet syntax when the language changes to Python', async () => {
    const wrapper = await mountAccess();
    const selector = wrapper.find('[data-testid="dataset-examples-lang"]');
    await (selector as ReturnType<typeof wrapper.find>).setValue('python');
    await flushPromises();

    const text = wrapper.find('[data-testid="dataset-api-examples"]').text();
    expect(text).toContain('requests.get');
    expect(text).toContain("'X-API-Key': 'YOUR_API_KEY'");
    expect(text).not.toContain('curl -H');
  });
});
