<template>
  <div class="dataset-issue-files">
    <ul class="dataset-issue-files-list">
      <li
        v-for="file in files"
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
          @click="downloadFile(file.id)"
        >
          {{ $t('dataset.access.files.download') }}
        </button>
      </li>
    </ul>
    <button
      type="button"
      class="vbwd-btn vbwd-btn--primary vbwd-btn--sm dataset-issue-archive-btn"
      data-testid="dataset-issue-archive"
      @click="downloadArchive"
    >
      {{ $t('dataset.access.files.downloadAll') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { datasetApi, type FileEntry } from '../api/datasetApi';

const BYTES_PER_KILOBYTE = 1024;

const props = defineProps<{
  slug: string;
  snapshotId: string;
  files: FileEntry[];
}>();

function formatSize(bytes: number): string {
  if (bytes < BYTES_PER_KILOBYTE) return `${bytes} B`;
  const kilobytes = bytes / BYTES_PER_KILOBYTE;
  if (kilobytes < BYTES_PER_KILOBYTE) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / BYTES_PER_KILOBYTE).toFixed(1)} MB`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  // The download routes are `@require_auth` with a Bearer session token that a
  // plain `<a href>` navigation can't carry (→ 401), so `datasetApi` fetches
  // the blob with the auth header and we trigger the browser download here.
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadFile(fileId: string): Promise<void> {
  const { blob, filename } = await datasetApi.downloadSnapshotFile(
    props.slug,
    props.snapshotId,
    fileId,
  );
  triggerBlobDownload(blob, filename);
}

async function downloadArchive(): Promise<void> {
  const { blob, filename } = await datasetApi.downloadIssueArchive(props.slug, props.snapshotId);
  triggerBlobDownload(blob, filename);
}
</script>

<style scoped>
/* Structural chrome (buttons) comes from the shared fe-user layer
   `vue/src/assets/vbwd-ui.css` (.vbwd-* classes). Only the per-file list layout
   and role accents live here. */
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
</style>
