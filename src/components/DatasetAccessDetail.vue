<template>
  <div
    class="dataset-access"
    data-testid="dataset-access-detail"
  >
    <router-link
      to="/dashboard/datasets"
      class="dataset-access-back"
    >
      &larr; {{ $t('dataset.myDatasets.title') }}
    </router-link>

    <h1 class="dataset-access-title">
      {{ meta?.slug || slug }}
    </h1>

    <!-- (0) The user's API key -->
    <section class="vbwd-card">
      <h2 class="vbwd-heading">
        {{ $t('dataset.access.apiKey') }}
      </h2>
      <ul
        v-if="datasetKeys.length"
        class="dataset-access-keys"
      >
        <li
          v-for="apiKey in datasetKeys"
          :key="apiKey.id"
          data-testid="dataset-access-api-key"
        >
          <span class="dataset-access-key-label">{{ apiKey.label }}</span>
          <code class="dataset-access-key-prefix">{{ apiKey.key_prefix }}…</code>
        </li>
      </ul>
      <p
        v-else
        class="dataset-access-nokey"
        data-testid="dataset-access-no-key"
      >
        {{ $t('dataset.access.noKey') }}
      </p>
      <router-link
        to="/dashboard/api-keys"
        class="dataset-access-manage-keys"
      >
        {{ $t('dataset.access.manageKeys') }}
      </router-link>
    </section>

    <!-- (1) API usage examples -->
    <section
      class="vbwd-card"
      data-testid="dataset-api-examples"
    >
      <h2 class="vbwd-heading">
        {{ $t('dataset.access.examples.title') }}
      </h2>

      <select
        v-model="exampleLang"
        class="vbwd-select dataset-examples-lang"
        data-testid="dataset-examples-lang"
      >
        <option value="curl">
          {{ $t('dataset.access.examples.langCurl') }}
        </option>
        <option value="php">
          {{ $t('dataset.access.examples.langPhp') }}
        </option>
        <option value="javascript">
          {{ $t('dataset.access.examples.langJavascript') }}
        </option>
        <option value="python">
          {{ $t('dataset.access.examples.langPython') }}
        </option>
      </select>

      <div
        v-for="operation in exampleOperations"
        :key="operation.key"
        class="dataset-example"
      >
        <div class="dataset-example-head">
          <span class="dataset-example-label">{{ $t(operation.labelKey) }}</span>
          <button
            type="button"
            class="vbwd-btn vbwd-btn--ghost vbwd-btn--sm"
            data-testid="dataset-example-copy"
            @click="copySnippet(operation.snippet)"
          >
            {{ $t('dataset.access.examples.copy') }}
          </button>
        </div>
        <pre class="dataset-example-pre"><code data-testid="dataset-example-snippet">{{ operation.snippet }}</code></pre>
      </div>
    </section>

    <!-- (b) Browser download button -->
    <section class="vbwd-card">
      <button
        type="button"
        class="vbwd-btn vbwd-btn--primary"
        data-testid="dataset-access-download"
        @click="download"
      >
        {{ $t('dataset.access.download') }}
      </button>
    </section>

    <!-- (c) Downloadable archive of snapshot versions -->
    <section
      class="vbwd-card"
      data-testid="dataset-archive"
    >
      <h2 class="vbwd-heading">
        {{ $t('dataset.access.archive.title') }}
      </h2>

      <div class="dataset-archive-toolbar">
        <input
          v-model="archiveSearch"
          type="search"
          class="vbwd-input dataset-archive-search"
          data-testid="dataset-archive-search"
          :placeholder="$t('dataset.access.archive.searchPlaceholder')"
        >
        <button
          type="button"
          class="vbwd-btn vbwd-btn--primary vbwd-btn--sm"
          data-testid="dataset-archive-bulk"
          :disabled="!selectedIds.length"
          @click="downloadSelected"
        >
          {{ $t('dataset.access.archive.downloadSelected') }}
        </button>
      </div>

      <p
        v-if="archiveError"
        class="dataset-archive-error"
        data-testid="dataset-archive-error"
      >
        {{ $t('dataset.access.archive.error') }}
      </p>
      <p
        v-else-if="!snapshots.length"
        class="dataset-archive-empty"
        data-testid="dataset-archive-empty"
      >
        {{ $t('dataset.access.archive.empty') }}
      </p>
      <template v-else>
        <table class="vbwd-table dataset-archive-table">
          <thead>
            <tr>
              <th class="dataset-archive-col-select">
                <input
                  type="checkbox"
                  data-testid="dataset-archive-select-all"
                  :checked="allOnPageSelected"
                  @change="toggleSelectAll(($event.target as HTMLInputElement).checked)"
                >
              </th>
              <th
                class="dataset-archive-col-sortable"
                data-testid="dataset-archive-sort-taken_at"
                @click="sortBy('taken_at')"
              >
                {{ $t('dataset.access.archive.takenAt') }}
                <span
                  v-if="sortColumn === 'taken_at'"
                  class="dataset-archive-sort-indicator"
                >{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th
                class="dataset-archive-col-sortable"
                data-testid="dataset-archive-sort-size"
                @click="sortBy('size')"
              >
                {{ $t('dataset.access.archive.size') }}
                <span
                  v-if="sortColumn === 'size'"
                  class="dataset-archive-sort-indicator"
                >{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th>{{ $t('dataset.access.archive.backend') }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <template
              v-for="snapshot in pagedSnapshots"
              :key="snapshot.id"
            >
              <tr data-testid="dataset-archive-row">
                <td class="dataset-archive-col-select">
                  <input
                    v-model="selection[snapshot.id]"
                    type="checkbox"
                    data-testid="dataset-archive-select"
                  >
                </td>
                <td>
                  {{ formatTakenAt(snapshot.taken_at) }}
                  <span
                    v-if="snapshot.is_last"
                    class="dataset-archive-last-badge"
                    data-testid="dataset-archive-last-badge"
                  >{{ $t('dataset.access.archive.last') }}</span>
                </td>
                <td>{{ formatSize(snapshot.size_bytes) }}</td>
                <td>{{ snapshot.storage_backend }}</td>
                <td class="dataset-archive-col-action">
                  <button
                    type="button"
                    class="vbwd-btn vbwd-btn--ghost vbwd-btn--sm"
                    data-testid="dataset-issue-files-toggle"
                    @click="toggleIssueFiles(snapshot.id)"
                  >
                    {{ $t('dataset.access.files.toggle') }}
                  </button>
                  <button
                    type="button"
                    class="vbwd-btn vbwd-btn--ghost vbwd-btn--sm"
                    data-testid="dataset-archive-download"
                    @click="downloadOne(snapshot.id)"
                  >
                    {{ $t('dataset.access.archive.download') }}
                  </button>
                </td>
              </tr>
              <tr
                v-if="expandedIssueId === snapshot.id"
                class="dataset-issue-files-row"
                data-testid="dataset-issue-files"
              >
                <td :colspan="ISSUE_FILES_COLSPAN">
                  <p
                    v-if="issueFilesLoading"
                    class="dataset-issue-files-status"
                    data-testid="dataset-issue-files-loading"
                  >
                    {{ $t('dataset.access.files.loading') }}
                  </p>
                  <p
                    v-else-if="issueFilesError"
                    class="dataset-issue-files-status dataset-issue-files-status--error"
                    data-testid="dataset-issue-files-error"
                  >
                    {{ $t('dataset.access.files.error') }}
                  </p>
                  <p
                    v-else-if="!issueFiles.length"
                    class="dataset-issue-files-status"
                    data-testid="dataset-issue-files-empty"
                  >
                    {{ $t('dataset.access.files.empty') }}
                  </p>
                  <template v-else>
                    <ul class="dataset-issue-files-list">
                      <li
                        v-for="file in issueFiles"
                        :key="file.id"
                        class="dataset-issue-file"
                        data-testid="dataset-issue-file-row"
                      >
                        <span
                          class="dataset-issue-file-role"
                          :class="`dataset-issue-file-role--${file.role}`"
                          data-testid="dataset-issue-file-role"
                        >{{ $t(`dataset.access.files.role.${file.role}`) }}</span>
                        <span class="dataset-issue-file-name">{{ file.filename }}</span>
                        <span class="dataset-issue-file-size">{{ formatSize(file.size_bytes) }}</span>
                        <button
                          type="button"
                          class="vbwd-btn vbwd-btn--ghost vbwd-btn--sm dataset-issue-file-btn"
                          data-testid="dataset-issue-file-download"
                          @click="downloadIssueFile(snapshot.id, file.id)"
                        >
                          {{ $t('dataset.access.files.download') }}
                        </button>
                      </li>
                    </ul>
                    <button
                      type="button"
                      class="vbwd-btn vbwd-btn--primary vbwd-btn--sm dataset-issue-archive-btn"
                      data-testid="dataset-issue-archive"
                      @click="downloadIssueArchive(snapshot.id)"
                    >
                      {{ $t('dataset.access.files.downloadAll') }}
                    </button>
                  </template>
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <div class="dataset-archive-pager">
          <button
            type="button"
            class="vbwd-btn vbwd-btn--ghost vbwd-btn--sm dataset-archive-page-btn"
            data-testid="dataset-archive-prev"
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
          >
            &larr;
          </button>
          <span
            class="dataset-archive-page-label"
            data-testid="dataset-archive-page"
          >
            {{ $t('dataset.access.archive.page') }} {{ currentPage }} / {{ totalPages }}
          </span>
          <button
            type="button"
            class="vbwd-btn vbwd-btn--ghost vbwd-btn--sm dataset-archive-page-btn"
            data-testid="dataset-archive-next"
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
          >
            &rarr;
          </button>
        </div>
      </template>
    </section>

    <!-- (e) Issue metadata -->
    <section
      v-if="meta"
      class="vbwd-card"
      data-testid="dataset-access-meta"
    >
      <h2 class="vbwd-heading">
        {{ $t('dataset.access.metadata') }}
      </h2>
      <dl class="dataset-access-meta-list">
        <div class="dataset-access-meta-row">
          <dt>{{ $t('dataset.access.source') }}</dt>
          <dd>{{ meta.source || '—' }}</dd>
        </div>
        <div class="dataset-access-meta-row">
          <dt>{{ $t('dataset.access.takenAt') }}</dt>
          <dd>{{ meta.taken_at || '—' }}</dd>
        </div>
        <div class="dataset-access-meta-row">
          <dt>{{ $t('dataset.access.size') }}</dt>
          <dd>{{ meta.size_bytes ?? '—' }}</dd>
        </div>
        <div class="dataset-access-meta-row">
          <dt>{{ $t('dataset.access.checksum') }}</dt>
          <dd>{{ meta.checksum || '—' }}</dd>
        </div>
        <div class="dataset-access-meta-row">
          <dt>{{ $t('dataset.access.attribution') }}</dt>
          <dd>{{ meta.attribution || '—' }}</dd>
        </div>
      </dl>
    </section>

    <!-- (f) First-100-rows spreadsheet preview -->
    <section class="vbwd-card">
      <h2 class="vbwd-heading">
        {{ $t('dataset.access.preview') }}
      </h2>
      <DatasetPreviewGrid
        :columns="preview.columns"
        :rows="preview.rows"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { ApiKey } from 'vbwd-view-component';
import { useApiKeysStore } from '@/stores/apiKeys';
import {
  datasetApi,
  type DatasetMeta,
  type DatasetPreview,
  type DatasetSnapshot,
  type FileEntry,
} from '../api/datasetApi';
import DatasetPreviewGrid from './DatasetPreviewGrid.vue';

const DATASET_SCOPE = 'dataset:read';
const ARCHIVE_PAGE_SIZE = 10;
const BYTES_PER_KILOBYTE = 1024;
const API_KEY_PLACEHOLDER = 'YOUR_API_KEY';
const SNAPSHOT_ID_PLACEHOLDER = 'SNAPSHOT_ID';
// The archive table has 5 columns (select, taken_at, size, backend, action);
// the expanded issue-files row spans all of them.
const ISSUE_FILES_COLSPAN = 5;

type SortColumn = 'taken_at' | 'size';
type SortDirection = 'asc' | 'desc';
type ExampleLanguage = 'curl' | 'php' | 'javascript' | 'python';

const props = defineProps<{ slug: string }>();

const apiKeysStore = useApiKeysStore();
const meta = ref<DatasetMeta | null>(null);
const preview = ref<DatasetPreview>({ columns: [], rows: [] });

// --- Archive table state --------------------------------------------------
const snapshots = ref<DatasetSnapshot[]>([]);
const archiveError = ref(false);
const archiveSearch = ref('');
const sortColumn = ref<SortColumn>('taken_at');
const sortDirection = ref<SortDirection>('desc');
const currentPage = ref(1);
const selection = reactive<Record<string, boolean>>({});

const filteredSnapshots = computed<DatasetSnapshot[]>(() => {
  const term = archiveSearch.value.trim().toLowerCase();
  if (!term) return snapshots.value;
  return snapshots.value.filter((snapshot) =>
    `${snapshot.taken_at} ${snapshot.storage_backend}`.toLowerCase().includes(term),
  );
});

const sortedSnapshots = computed<DatasetSnapshot[]>(() => {
  const rows = [...filteredSnapshots.value];
  rows.sort((left, right) => {
    let comparison: number;
    if (sortColumn.value === 'size') {
      comparison = left.size_bytes - right.size_bytes;
    } else {
      comparison = left.taken_at.localeCompare(right.taken_at);
    }
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
  return rows;
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(sortedSnapshots.value.length / ARCHIVE_PAGE_SIZE)),
);

const pagedSnapshots = computed<DatasetSnapshot[]>(() => {
  const start = (currentPage.value - 1) * ARCHIVE_PAGE_SIZE;
  return sortedSnapshots.value.slice(start, start + ARCHIVE_PAGE_SIZE);
});

const selectedIds = computed<string[]>(() =>
  Object.keys(selection).filter((id) => selection[id]),
);

const allOnPageSelected = computed(
  () =>
    pagedSnapshots.value.length > 0 &&
    pagedSnapshots.value.every((snapshot) => selection[snapshot.id]),
);

function sortBy(column: SortColumn): void {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
}

function goToPage(page: number): void {
  currentPage.value = Math.min(Math.max(1, page), totalPages.value);
}

function toggleSelectAll(checked: boolean): void {
  pagedSnapshots.value.forEach((snapshot) => {
    selection[snapshot.id] = checked;
  });
}

// Changing the search resets to the first page so the pager stays in bounds.
watch(archiveSearch, () => {
  currentPage.value = 1;
});

function formatSize(bytes: number): string {
  if (bytes < BYTES_PER_KILOBYTE) return `${bytes} B`;
  const kilobytes = bytes / BYTES_PER_KILOBYTE;
  if (kilobytes < BYTES_PER_KILOBYTE) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / BYTES_PER_KILOBYTE).toFixed(1)} MB`;
}

function formatTakenAt(value: string): string {
  return value.replace('T', ' ').replace('Z', '').trim();
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function download(): Promise<void> {
  // `/download` is `@require_auth` with a Bearer session token, which a plain
  // `<a href>` navigation can't send (→ 401). Fetch the blob with the auth
  // header, then trigger the browser download from an object-URL.
  const { blob, filename } = await datasetApi.download(props.slug);
  triggerBlobDownload(blob, filename);
}

async function downloadOne(snapshotId: string): Promise<void> {
  const { blob, filename } = await datasetApi.downloadSnapshot(props.slug, snapshotId);
  triggerBlobDownload(blob, filename);
}

async function downloadSelected(): Promise<void> {
  // Sequential so we don't fire a burst of authed requests at once.
  for (const snapshotId of selectedIds.value) {
    const { blob, filename } = await datasetApi.downloadSnapshot(props.slug, snapshotId);
    triggerBlobDownload(blob, filename);
  }
}

// --- Per-issue multi-file panel (S124) ------------------------------------
// An issue is a bundle: the primary data file plus any extra files (report,
// charts, …). Files are loaded lazily when an issue is expanded.
const expandedIssueId = ref<string | null>(null);
const issueFiles = ref<FileEntry[]>([]);
const issueFilesLoading = ref(false);
const issueFilesError = ref(false);

async function toggleIssueFiles(snapshotId: string): Promise<void> {
  if (expandedIssueId.value === snapshotId) {
    expandedIssueId.value = null;
    issueFiles.value = [];
    return;
  }
  expandedIssueId.value = snapshotId;
  issueFiles.value = [];
  issueFilesError.value = false;
  issueFilesLoading.value = true;
  try {
    issueFiles.value = await datasetApi.listSnapshotFiles(props.slug, snapshotId);
  } catch {
    issueFilesError.value = true;
  } finally {
    issueFilesLoading.value = false;
  }
}

async function downloadIssueFile(snapshotId: string, fileId: string): Promise<void> {
  const { blob, filename } = await datasetApi.downloadSnapshotFile(props.slug, snapshotId, fileId);
  triggerBlobDownload(blob, filename);
}

async function downloadIssueArchive(snapshotId: string): Promise<void> {
  const { blob, filename } = await datasetApi.downloadIssueArchive(props.slug, snapshotId);
  triggerBlobDownload(blob, filename);
}

// --- API usage examples ---------------------------------------------------
const exampleLang = ref<ExampleLanguage>('curl');

const exampleBaseUrl = computed(() => {
  const origin =
    typeof window !== 'undefined' && window.location ? window.location.origin : '';
  return `${origin}/api/v1/dataset/${props.slug}`;
});

interface ExampleOperation {
  key: string;
  labelKey: string;
  url: string;
  isDownload: boolean;
  snippet: string;
}

function buildSnippet(language: ExampleLanguage, url: string, isDownload: boolean): string {
  switch (language) {
    case 'php':
      return [
        '<?php',
        '$context = stream_context_create([',
        "    'http' => ['header' => 'X-API-Key: " + API_KEY_PLACEHOLDER + "'],",
        ']);',
        `$data = file_get_contents('${url}', false, $context);`,
      ].join('\n');
    case 'javascript':
      return [
        `fetch('${url}', {`,
        `  headers: { 'X-API-Key': '${API_KEY_PLACEHOLDER}' },`,
        '})',
        '  .then((response) => response.blob())',
        '  .then((body) => console.log(body));',
      ].join('\n');
    case 'python':
      return [
        'import requests',
        '',
        `response = requests.get('${url}', headers={'X-API-Key': '${API_KEY_PLACEHOLDER}'})`,
        'print(response.content)',
      ].join('\n');
    case 'curl':
    default:
      return isDownload
        ? `curl -OJ -H "X-API-Key: ${API_KEY_PLACEHOLDER}" "${url}"`
        : `curl -H "X-API-Key: ${API_KEY_PLACEHOLDER}" "${url}"`;
  }
}

const exampleOperations = computed<ExampleOperation[]>(() => {
  const base = exampleBaseUrl.value;
  const definitions = [
    {
      key: 'latest',
      labelKey: 'dataset.access.examples.opLatest',
      url: `${base}/data`,
      isDownload: true,
    },
    {
      key: 'list',
      labelKey: 'dataset.access.examples.opList',
      url: `${base}/snapshots`,
      isDownload: false,
    },
    {
      key: 'exact',
      labelKey: 'dataset.access.examples.opExact',
      url: `${base}/snapshots/${SNAPSHOT_ID_PLACEHOLDER}/download`,
      isDownload: true,
    },
  ];
  return definitions.map((definition) => ({
    ...definition,
    snippet: buildSnippet(exampleLang.value, definition.url, definition.isDownload),
  }));
});

function copySnippet(snippet: string): void {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(snippet).catch(() => undefined);
  }
}

// Show the caller's own keys that carry the dataset read scope so they know
// which key to use against the scoped API URL above.
const datasetKeys = computed<ApiKey[]>(() =>
  apiKeysStore.keys.filter((apiKey) => apiKey.scopes.includes(DATASET_SCOPE)),
);

async function loadMeta() {
  try {
    meta.value = await datasetApi.getMeta(props.slug);
  } catch {
    meta.value = null;
  }
}

async function loadPreview() {
  try {
    preview.value = await datasetApi.getPreview(props.slug);
  } catch {
    preview.value = { columns: [], rows: [] };
  }
}

async function loadSnapshots() {
  try {
    snapshots.value = await datasetApi.listSnapshots(props.slug);
    archiveError.value = false;
  } catch {
    snapshots.value = [];
    archiveError.value = true;
  }
}

onMounted(() => {
  apiKeysStore.fetchKeys().catch(() => undefined);
  loadMeta();
  loadPreview();
  loadSnapshots();
});
</script>

<style scoped>
/* Structural chrome (card, heading, table, buttons, inputs) comes from the
   shared fe-user layer `vue/src/assets/vbwd-ui.css` (.vbwd-* classes). Only
   dataset-specific layout / accents live here. */
.dataset-access { max-width: 900px; margin: 0 auto; }
.dataset-access-back { display: inline-block; margin-bottom: 16px; color: var(--vbwd-primary, #3498db); text-decoration: none; font-size: 0.9rem; }
.dataset-access-back:hover { text-decoration: underline; }
.dataset-access-title { color: var(--vbwd-heading, #2c3e50); margin-bottom: 20px; }
.dataset-access-keys { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.dataset-access-keys li { display: flex; gap: 10px; align-items: center; }
.dataset-access-key-label { font-weight: 600; color: var(--vbwd-heading, #2c3e50); }
.dataset-access-key-prefix { font-family: monospace; color: #6b7280; }
.dataset-access-nokey { color: #9ca3af; font-style: italic; margin: 0 0 8px; }
.dataset-access-manage-keys { display: inline-block; margin-top: 10px; color: var(--vbwd-primary, #3498db); text-decoration: none; font-size: 0.9rem; }
.dataset-access-meta-list { margin: 0; }
.dataset-access-meta-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.dataset-access-meta-row dt { color: #6b7280; }
.dataset-access-meta-row dd { margin: 0; color: var(--vbwd-heading, #2c3e50); font-weight: 500; word-break: break-all; }

.dataset-archive-toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; }
.dataset-archive-search { flex: 1; }
.dataset-archive-error { color: #c0392b; }
.dataset-archive-empty { color: #9ca3af; font-style: italic; }
.dataset-archive-table { font-size: 0.85rem; }
.dataset-archive-col-select { width: 32px; }
.dataset-archive-col-action { text-align: right; }
.dataset-archive-col-sortable { cursor: pointer; user-select: none; }
.dataset-archive-sort-indicator { color: #6b7280; font-size: 0.7rem; }
.dataset-archive-last-badge { margin-left: 6px; padding: 1px 6px; background: #e8f5e9; color: #2e7d32; border-radius: 10px; font-size: 0.7rem; }
.dataset-archive-pager { display: flex; gap: 12px; align-items: center; justify-content: center; margin-top: 12px; }
.dataset-archive-page-label { color: #6b7280; font-size: 0.85rem; }

.dataset-issue-files-row td { background: #f9fafb; padding: 10px 14px; }
.dataset-issue-files-status { margin: 0; color: #6b7280; font-style: italic; }
.dataset-issue-files-status--error { color: #c0392b; font-style: normal; }
.dataset-issue-files-list { list-style: none; margin: 0 0 10px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.dataset-issue-file { display: flex; gap: 10px; align-items: center; }
.dataset-issue-file-role { padding: 1px 8px; border-radius: 10px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.02em; background: #eef2f7; color: #475569; }
.dataset-issue-file-role--data { background: #e8f5e9; color: #2e7d32; }
.dataset-issue-file-role--document { background: #e3f2fd; color: #1565c0; }
.dataset-issue-file-role--chart { background: #fff3e0; color: #e65100; }
.dataset-issue-file-name { font-weight: 500; color: var(--vbwd-heading, #2c3e50); }
.dataset-issue-file-size { color: #6b7280; font-size: 0.8rem; }
.dataset-issue-file-btn { margin-left: auto; }
.dataset-issue-archive-btn { margin-top: 4px; }

.dataset-examples-lang { margin-bottom: 12px; }
.dataset-example { margin-bottom: 14px; }
.dataset-example-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.dataset-example-label { font-weight: 600; color: var(--vbwd-heading, #2c3e50); font-size: 0.85rem; }
.dataset-example-pre { margin: 0; padding: 12px; background: #1e293b; color: #e2e8f0; border-radius: 6px; overflow-x: auto; font-size: 0.8rem; }
.dataset-example-pre code { font-family: monospace; white-space: pre; }
</style>
