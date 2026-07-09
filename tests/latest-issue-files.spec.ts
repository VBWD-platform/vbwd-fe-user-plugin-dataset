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
import IssueFileList from '../src/components/IssueFileList.vue';

const tFallback = (key: string) => key;

function makeSnapshot(id: string, isLast: boolean): DatasetSnapshot {
  return {
    id,
    taken_at: `2026-06-${id === 'snap-latest' ? '30' : '01'}T08:00:00Z`,
    size_bytes: 2048,
    ext: 'csv',
    checksum: `sha256:${id}`,
    storage_backend: 'local',
    is_last: isLast,
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
      download_url: '/api/v1/dataset/air-quality/snapshots/snap-latest/files/primary/download',
    },
    {
      id: 'file-2',
      role: 'document',
      filename: 'report.pdf',
      ext: 'pdf',
      content_type: 'application/pdf',
      size_bytes: 4096,
      checksum: 'sha256:bbb',
      download_url: '/api/v1/dataset/air-quality/snapshots/snap-latest/files/file-2/download',
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

describe('DatasetAccessDetail — latest issue files (surfaced without a toggle)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchKeys.mockResolvedValue(undefined);
    mockGetMeta.mockResolvedValue(null);
    mockGetPreview.mockResolvedValue({ columns: [], rows: [] });
    mockListSnapshots.mockResolvedValue([
      makeSnapshot('snap-old', false),
      makeSnapshot('snap-latest', true),
    ]);
    mockListSnapshotFiles.mockResolvedValue(makeFiles());
  });

  it('auto-loads the is_last snapshot files and renders them via IssueFileList', async () => {
    const wrapper = await mountAccess();

    // No toggle click — the latest issue block loads on mount for the is_last snapshot.
    expect(mockListSnapshotFiles).toHaveBeenCalledWith('air-quality', 'snap-latest');

    const block = wrapper.find('[data-testid="dataset-latest-files"]');
    expect(block.exists()).toBe(true);

    const lists = wrapper.findAllComponents(IssueFileList);
    // Exactly one IssueFileList is on the page pre-toggle: the latest-issue block.
    expect(lists.length).toBe(1);
    expect(lists[0].props('snapshotId')).toBe('snap-latest');
    expect(lists[0].props('slug')).toBe('air-quality');

    const rows = block.findAll('[data-testid="dataset-issue-file-row"]');
    expect(rows.length).toBe(2);
    expect(block.text()).toContain('report.pdf');
  });

  it('shows an error state in the latest block when file listing fails', async () => {
    mockListSnapshotFiles.mockRejectedValue(new Error('boom'));
    const wrapper = await mountAccess();

    expect(wrapper.find('[data-testid="dataset-latest-files-error"]').exists()).toBe(true);
    expect(wrapper.findAllComponents(IssueFileList).length).toBe(0);
  });

  it('shows an empty state when there is no is_last snapshot', async () => {
    mockListSnapshots.mockResolvedValue([makeSnapshot('snap-old', false)]);
    const wrapper = await mountAccess();

    expect(mockListSnapshotFiles).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="dataset-latest-files-empty"]').exists()).toBe(true);
  });

  it('still renders the archive-row Files toggle using the shared IssueFileList', async () => {
    const wrapper = await mountAccess();

    // Expanding an archive row mounts a second IssueFileList (the latest block is the first).
    const toggles = wrapper.findAll('[data-testid="dataset-issue-files-toggle"]');
    await toggles[0].trigger('click');
    await flushPromises();

    const lists = wrapper.findAllComponents(IssueFileList);
    expect(lists.length).toBe(2);
  });
});
