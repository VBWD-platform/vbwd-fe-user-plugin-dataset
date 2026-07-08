import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { datasetApi, type FileEntry } from '../src/api/datasetApi';

// A minimal Response-ish stub with the two surfaces the api methods read:
// `.headers.get(...)` and `.blob()` (plus `.json()` for the list method).
function makeResponse(options: {
  ok?: boolean;
  status?: number;
  json?: unknown;
  blob?: Blob;
  disposition?: string;
}): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => options.json,
    blob: async () => options.blob ?? new Blob([]),
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-disposition' ? options.disposition ?? '' : null,
    },
  } as unknown as Response;
}

describe('datasetApi — issue (multi-file) endpoints', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.setItem('auth_token', 'session-jwt');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('listSnapshotFiles returns the files array and sends the auth header', async () => {
    const files: FileEntry[] = [
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
    fetchMock.mockResolvedValue(makeResponse({ json: { files, total: 2 } }));

    const result = await datasetApi.listSnapshotFiles('air-quality', 'snap-1');

    expect(result).toEqual(files);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/dataset/air-quality/snapshots/snap-1/files');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer session-jwt' });
  });

  it('listSnapshotFiles throws on a non-ok response', async () => {
    fetchMock.mockResolvedValue(makeResponse({ ok: false, status: 403, json: {} }));
    await expect(datasetApi.listSnapshotFiles('air-quality', 'snap-1')).rejects.toThrow();
  });

  it('downloadSnapshotFile returns a blob + the Content-Disposition filename', async () => {
    const blob = new Blob(['%PDF-1.4']);
    fetchMock.mockResolvedValue(
      makeResponse({ blob, disposition: 'attachment; filename="report.pdf"' }),
    );

    const result = await datasetApi.downloadSnapshotFile('air-quality', 'snap-1', 'file-2');

    expect(result.blob).toBe(blob);
    expect(result.filename).toBe('report.pdf');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/dataset/air-quality/snapshots/snap-1/files/file-2/download',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer session-jwt' }),
      }),
    );
  });

  it('downloadSnapshotFile falls back to the file id when no disposition is present', async () => {
    fetchMock.mockResolvedValue(makeResponse({ blob: new Blob(['x']) }));
    const result = await datasetApi.downloadSnapshotFile('air-quality', 'snap-1', 'primary');
    expect(result.filename).toBe('primary');
  });

  it('downloadSnapshotFile throws on a non-ok response', async () => {
    fetchMock.mockResolvedValue(makeResponse({ ok: false, status: 401 }));
    await expect(
      datasetApi.downloadSnapshotFile('air-quality', 'snap-1', 'file-2'),
    ).rejects.toThrow();
  });

  it('downloadIssueArchive returns the zip blob + the archive filename', async () => {
    const blob = new Blob(['PK']);
    fetchMock.mockResolvedValue(
      makeResponse({ blob, disposition: 'attachment; filename="air-quality-2026-06-30.zip"' }),
    );

    const result = await datasetApi.downloadIssueArchive('air-quality', 'snap-1');

    expect(result.blob).toBe(blob);
    expect(result.filename).toBe('air-quality-2026-06-30.zip');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/dataset/air-quality/snapshots/snap-1/archive',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer session-jwt' }),
      }),
    );
  });

  it('downloadIssueArchive falls back to a slug-derived name without a disposition', async () => {
    fetchMock.mockResolvedValue(makeResponse({ blob: new Blob(['x']) }));
    const result = await datasetApi.downloadIssueArchive('air-quality', 'snap-1');
    expect(result.filename).toBe('air-quality.zip');
  });
});
