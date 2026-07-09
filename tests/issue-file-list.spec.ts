import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { FileEntry } from '../src/api/datasetApi';

const mockDownloadSnapshotFile = vi.fn();
const mockDownloadIssueArchive = vi.fn();

vi.mock('../src/api/datasetApi', () => ({
  datasetApi: {
    downloadSnapshotFile: (...args: unknown[]) => mockDownloadSnapshotFile(...args),
    downloadIssueArchive: (...args: unknown[]) => mockDownloadIssueArchive(...args),
  },
}));

import IssueFileList from '../src/components/IssueFileList.vue';

const tFallback = (key: string) => key;

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

function mountList() {
  return mount(IssueFileList, {
    props: { slug: 'air-quality', snapshotId: 'snap-1', files: makeFiles() },
    global: { mocks: { $t: tFallback } },
  });
}

describe('IssueFileList — shared per-issue file rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a row per file with role badge, name and human-readable size', () => {
    const wrapper = mountList();

    const rows = wrapper.findAll('[data-testid="dataset-issue-file-row"]');
    expect(rows.length).toBe(2);

    const badges = wrapper.findAll('[data-testid="dataset-issue-file-role"]');
    expect(badges[0].text()).toContain('data');
    expect(badges[1].text()).toContain('document');

    expect(rows[1].text()).toContain('report.pdf');
    // Human-readable size (4096 B → 4.0 KB), not the raw byte count.
    expect(rows[1].text()).toContain('4.0 KB');
  });

  it('downloads a single file via downloadSnapshotFile + object-URL anchor', async () => {
    mockDownloadSnapshotFile.mockResolvedValue({
      blob: new Blob(['%PDF']),
      filename: 'report.pdf',
    });
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const wrapper = mountList();
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

    const wrapper = mountList();
    await wrapper.find('[data-testid="dataset-issue-archive"]').trigger('click');
    await flushPromises();

    expect(mockDownloadIssueArchive).toHaveBeenCalledWith('air-quality', 'snap-1');
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
