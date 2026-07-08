import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import type { DatasetSnapshot, FileEntry } from '../src/api/datasetApi';

const mockGetMeta = vi.fn();
const mockGetPreview = vi.fn();
const mockFetchKeys = vi.fn();
const mockDownload = vi.fn();
const mockListSnapshots = vi.fn();
const mockDownloadSnapshot = vi.fn();
const mockListSnapshotFiles = vi.fn();
const mockDownloadSnapshotFile = vi.fn();
const mockDownloadIssueArchive = vi.fn();

vi.mock('../src/api/datasetApi', () => ({
  datasetApi: {
    getMeta: (...args: unknown[]) => mockGetMeta(...args),
    getPreview: (...args: unknown[]) => mockGetPreview(...args),
    dataUrl: (slug: string) => `/api/v1/dataset/${slug}/data`,
    downloadUrl: (slug: string) => `/api/v1/dataset/${slug}/download`,
    download: (...args: unknown[]) => mockDownload(...args),
    listSnapshots: (...args: unknown[]) => mockListSnapshots(...args),
    downloadSnapshot: (...args: unknown[]) => mockDownloadSnapshot(...args),
    listSnapshotFiles: (...args: unknown[]) => mockListSnapshotFiles(...args),
    downloadSnapshotFile: (...args: unknown[]) => mockDownloadSnapshotFile(...args),
    downloadIssueArchive: (...args: unknown[]) => mockDownloadIssueArchive(...args),
  },
}));

const apiKeysState = { keys: [] as unknown[], fetchKeys: mockFetchKeys };
vi.mock('@/stores/apiKeys', () => ({
  useApiKeysStore: () => apiKeysState,
}));

import DatasetAccessDetail from '../src/components/DatasetAccessDetail.vue';

const tFallback = (key: string) => key;

function makeSnapshot(id: string): DatasetSnapshot {
  return {
    id,
    taken_at: '2026-06-30T08:00:00Z',
    size_bytes: 2048,
    ext: 'csv',
    checksum: `sha256:${id}`,
    storage_backend: 'local',
    is_last: true,
  };
}

function makeFiles(): FileEntry[] {
  return [
    {
      id: 'primary',
      role: 'data',
      filename: 'air-quality.csv',
      ext: 'csv',
      content_type: 'text/csv',
      size_bytes: 2048,
      checksum: 'sha256:aaa',
      download_url: '/api/v1/dataset/air-quality/snapshots/snap-1/files/primary/download',
    },
    {
      id: 'file-2',
      role: 'document',
      filename: 'report.pdf',
      ext: 'pdf',
      content_type: 'application/pdf',
      size_bytes: 4096,
      checksum: 'sha256:bbb',
      download_url: '/api/v1/dataset/air-quality/snapshots/snap-1/files/file-2/download',
    },
  ];
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

describe('DatasetAccessDetail — per-issue multi-file panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchKeys.mockResolvedValue(undefined);
    mockGetMeta.mockResolvedValue(null);
    mockGetPreview.mockResolvedValue({ columns: [], rows: [] });
    mockListSnapshots.mockResolvedValue([makeSnapshot('snap-1')]);
    mockListSnapshotFiles.mockResolvedValue(makeFiles());
  });

  it('lists the issue files with role badges when the issue is expanded', async () => {
    const wrapper = await mountAccess();

    // Files are lazily loaded per issue when its toggle is clicked.
    await wrapper.find('[data-testid="dataset-issue-files-toggle"]').trigger('click');
    await flushPromises();

    expect(mockListSnapshotFiles).toHaveBeenCalledWith('air-quality', 'snap-1');
    const rows = wrapper.findAll('[data-testid="dataset-issue-file-row"]');
    expect(rows.length).toBe(2);
    const badges = wrapper.findAll('[data-testid="dataset-issue-file-role"]');
    expect(badges[0].text()).toContain('data');
    expect(badges[1].text()).toContain('document');
    expect(rows[1].text()).toContain('report.pdf');
    // Human-readable size (4096 B → 4.0 KB), not the raw byte count.
    expect(rows[1].text()).toContain('4.0 KB');
  });

  it('downloads a single issue file via downloadSnapshotFile + object-URL anchor', async () => {
    mockDownloadSnapshotFile.mockResolvedValue({
      blob: new Blob(['%PDF']),
      filename: 'report.pdf',
    });
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const wrapper = await mountAccess();
    await wrapper.find('[data-testid="dataset-issue-files-toggle"]').trigger('click');
    await flushPromises();

    const downloadButtons = wrapper.findAll('[data-testid="dataset-issue-file-download"]');
    await downloadButtons[1].trigger('click');
    await flushPromises();

    expect(mockDownloadSnapshotFile).toHaveBeenCalledWith('air-quality', 'snap-1', 'file-2');
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('downloads the whole issue as a zip via downloadIssueArchive', async () => {
    mockDownloadIssueArchive.mockResolvedValue({
      blob: new Blob(['PK']),
      filename: 'air-quality-2026-06-30.zip',
    });
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const wrapper = await mountAccess();
    await wrapper.find('[data-testid="dataset-issue-files-toggle"]').trigger('click');
    await flushPromises();

    await wrapper.find('[data-testid="dataset-issue-archive"]').trigger('click');
    await flushPromises();

    expect(mockDownloadIssueArchive).toHaveBeenCalledWith('air-quality', 'snap-1');
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('collapses the panel when the toggle is clicked again', async () => {
    const wrapper = await mountAccess();
    const toggle = () => wrapper.find('[data-testid="dataset-issue-files-toggle"]');

    await toggle().trigger('click');
    await flushPromises();
    expect(wrapper.findAll('[data-testid="dataset-issue-file-row"]').length).toBe(2);

    await toggle().trigger('click');
    await flushPromises();
    expect(wrapper.findAll('[data-testid="dataset-issue-file-row"]').length).toBe(0);
  });

  it('shows an error state when listing the issue files fails', async () => {
    mockListSnapshotFiles.mockRejectedValue(new Error('boom'));
    const wrapper = await mountAccess();

    await wrapper.find('[data-testid="dataset-issue-files-toggle"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="dataset-issue-files-error"]').exists()).toBe(true);
  });
});
