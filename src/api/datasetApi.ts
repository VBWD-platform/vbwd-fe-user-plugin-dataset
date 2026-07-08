// fe-user client for the datasets plugin backend (S110).
//
// Consumes the real, session/api-key-scoped endpoints:
//   GET /api/v1/dataset                      — public catalogue (by dataset_category, search)
//   GET /api/v1/dataset/<slug>               — public catalogue detail (for the Data store detail page)
//   GET /api/v1/dataset/my                   — the caller's entitled datasets (session-auth)
//   GET /api/v1/dataset/categories           — catalogue categories
//   GET /api/v1/dataset/<slug>/preview       — first 100 rows { columns, rows } (session-auth)
//   GET /api/v1/dataset/<slug>/meta          — issue metadata (session-auth)
//   GET /api/v1/dataset/<slug>/data          — the `last` snapshot (api-key scoped: dataset:read)
//   GET /api/v1/dataset/<slug>/download      — browser download (session-auth, attachment)

const API = '/api/v1/dataset';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
  const response = await fetch(url + queryString, { headers: authHeaders() });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response.json();
}

/** Prefer the server-provided attachment name from Content-Disposition. */
function filenameFromDisposition(response: Response, fallback: string): string {
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/**
 * Fetch an authed download as a Blob. The download routes are `@require_auth`
 * with a Bearer session token that a plain `<a href>` navigation can't carry
 * (→ 401), so we fetch with the auth header and hand back a Blob the caller
 * turns into an object-URL download.
 */
async function downloadBlob(
  url: string,
  fallbackName: string,
): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  return { blob: await response.blob(), filename: filenameFromDisposition(response, fallbackName) };
}

export interface DatasetListItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  source_attribution: string | null;
  // The stored (brutto-basis) price the one-time order charges for.
  price: number;
  tariff_plan_id: string | null;
  category_slug: string | null;
  is_active: boolean;
}

export interface Dataset extends DatasetListItem {
  last_taken_at: string | null;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  custom_field_defs?: import('vbwd-view-component').CustomFieldDef[];
}

export interface DatasetPaginated<TItem> {
  items: TItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface DatasetCategory {
  slug: string;
  label: string;
}

/** Issue metadata for a dataset's `last` snapshot (source, checksum, licence …). */
export interface DatasetMeta {
  slug: string;
  taken_at: string | null;
  source: string | null;
  size_bytes: number | null;
  checksum: string | null;
  attribution: string | null;
}

/** Capped (≤100 rows) structured preview of the `last` snapshot. */
export interface DatasetPreview {
  columns: string[];
  rows: Array<Array<string | number | null>>;
}

/** One archived snapshot version of a dataset (the downloadable archive table). */
export interface DatasetSnapshot {
  id: string;
  taken_at: string;
  size_bytes: number;
  ext: string;
  checksum: string;
  storage_backend: string;
  is_last: boolean;
}

/**
 * One file within an issue (S124). The primary data file is synthesised with
 * the stable id `"primary"` and appears first; extra files (PDF report, charts,
 * …) follow. `download_url` points at the per-file download route.
 */
export interface FileEntry {
  id: string;
  role: 'data' | 'document' | 'chart' | 'other';
  filename: string;
  ext: string;
  content_type: string | null;
  size_bytes: number;
  checksum: string | null;
  download_url: string;
}

export const datasetApi = {
  listDatasets(params: Record<string, string> = {}): Promise<DatasetPaginated<DatasetListItem>> {
    return get(`${API}`, params);
  },
  getDataset(slug: string): Promise<Dataset> {
    return get(`${API}/${slug}`);
  },
  /** The caller's entitled datasets (for the "My datasets" dashboard). */
  listMyDatasets(): Promise<DatasetListItem[]> {
    return get(`${API}/my`);
  },
  getCategories(): Promise<{ categories: DatasetCategory[] }> {
    return get(`${API}/categories`);
  },
  getMeta(slug: string): Promise<DatasetMeta> {
    return get(`${API}/${slug}/meta`);
  },
  getPreview(slug: string): Promise<DatasetPreview> {
    return get(`${API}/${slug}/preview`);
  },
  /** Scoped-read API URL shown on the access page (fetched with an API key). */
  dataUrl(slug: string): string {
    return `${API}/${slug}/data`;
  },
  /** Browser-download URL (session-auth, Content-Disposition: attachment). */
  downloadUrl(slug: string): string {
    return `${API}/${slug}/download`;
  },
  /** Fetch the `last` snapshot as an auth-carrying Blob (see `downloadBlob`). */
  download(slug: string): Promise<{ blob: Blob; filename: string }> {
    return downloadBlob(`${API}/${slug}/download`, slug);
  },
  /** The dataset's archived snapshot versions (session-auth or X-API-Key). */
  async listSnapshots(slug: string): Promise<DatasetSnapshot[]> {
    const payload = await get<{ snapshots: DatasetSnapshot[] }>(`${API}/${slug}/snapshots`);
    return payload.snapshots;
  },
  /** Fetch one exact archived snapshot as an auth-carrying Blob. */
  downloadSnapshot(slug: string, snapshotId: string): Promise<{ blob: Blob; filename: string }> {
    return downloadBlob(`${API}/${slug}/snapshots/${snapshotId}/download`, snapshotId);
  },
  /**
   * List every file within one issue (S124): the primary data file first
   * (id `"primary"`), then any extra files. Session-auth + entitlement gated.
   */
  async listSnapshotFiles(slug: string, snapshotId: string): Promise<FileEntry[]> {
    const payload = await get<{ files: FileEntry[]; total: number }>(
      `${API}/${slug}/snapshots/${snapshotId}/files`,
    );
    return payload.files;
  },
  /** Fetch one file of an issue as an auth-carrying Blob (id may be `"primary"`). */
  downloadSnapshotFile(
    slug: string,
    snapshotId: string,
    fileId: string,
  ): Promise<{ blob: Blob; filename: string }> {
    return downloadBlob(`${API}/${slug}/snapshots/${snapshotId}/files/${fileId}/download`, fileId);
  },
  /** Fetch the whole issue (primary + every extra file) as a zip Blob. */
  downloadIssueArchive(
    slug: string,
    snapshotId: string,
  ): Promise<{ blob: Blob; filename: string }> {
    return downloadBlob(`${API}/${slug}/snapshots/${snapshotId}/archive`, `${slug}.zip`);
  },
};
