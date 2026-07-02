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

    <!-- (a) Scoped API URL + the user's API key -->
    <section class="dataset-access-card">
      <h2 class="dataset-access-heading">
        {{ $t('dataset.access.apiUrl') }}
      </h2>
      <code
        class="dataset-access-url"
        data-testid="dataset-access-api-url"
      >GET {{ apiUrl }}</code>

      <h3 class="dataset-access-subheading">
        {{ $t('dataset.access.apiKey') }}
      </h3>
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

    <!-- (b) Browser download button -->
    <section class="dataset-access-card">
      <button
        type="button"
        class="dataset-access-download"
        data-testid="dataset-access-download"
        @click="download"
      >
        {{ $t('dataset.access.download') }}
      </button>
    </section>

    <!-- (c) Issue metadata -->
    <section
      v-if="meta"
      class="dataset-access-card"
      data-testid="dataset-access-meta"
    >
      <h2 class="dataset-access-heading">
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

    <!-- (d) First-100-rows spreadsheet preview -->
    <section class="dataset-access-card">
      <h2 class="dataset-access-heading">
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
import { computed, onMounted, ref } from 'vue';
import type { ApiKey } from 'vbwd-view-component';
import { useApiKeysStore } from '@/stores/apiKeys';
import {
  datasetApi,
  type DatasetMeta,
  type DatasetPreview,
} from '../api/datasetApi';
import DatasetPreviewGrid from './DatasetPreviewGrid.vue';

const DATASET_SCOPE = 'dataset:read';

const props = defineProps<{ slug: string }>();

const apiKeysStore = useApiKeysStore();
const meta = ref<DatasetMeta | null>(null);
const preview = ref<DatasetPreview>({ columns: [], rows: [] });

const apiUrl = computed(() => datasetApi.dataUrl(props.slug));

async function download(): Promise<void> {
  // `/download` is `@require_auth` with a Bearer session token, which a plain
  // `<a href>` navigation can't send (→ 401). Fetch the blob with the auth
  // header, then trigger the browser download from an object-URL.
  const { blob, filename } = await datasetApi.download(props.slug);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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

onMounted(() => {
  apiKeysStore.fetchKeys().catch(() => undefined);
  loadMeta();
  loadPreview();
});
</script>

<style scoped>
.dataset-access { max-width: 900px; margin: 0 auto; }
.dataset-access-back { display: inline-block; margin-bottom: 16px; color: #3498db; text-decoration: none; font-size: 0.9rem; }
.dataset-access-back:hover { text-decoration: underline; }
.dataset-access-title { color: #2c3e50; margin-bottom: 20px; }
.dataset-access-card { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 18px; box-shadow: 0 2px 5px rgba(0,0,0,.05); }
.dataset-access-heading { font-size: 1rem; color: #2c3e50; margin: 0 0 12px; }
.dataset-access-subheading { font-size: 0.9rem; color: #6b7280; margin: 16px 0 8px; }
.dataset-access-url { display: block; padding: 10px 12px; background: #f4f6f8; border: 1px solid #e9ecef; border-radius: 6px; font-family: monospace; font-size: 0.85rem; color: #2c3e50; word-break: break-all; }
.dataset-access-keys { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.dataset-access-keys li { display: flex; gap: 10px; align-items: center; }
.dataset-access-key-label { font-weight: 600; color: #2c3e50; }
.dataset-access-key-prefix { font-family: monospace; color: #6b7280; }
.dataset-access-nokey { color: #9ca3af; font-style: italic; margin: 0 0 8px; }
.dataset-access-manage-keys { display: inline-block; margin-top: 10px; color: var(--vbwd-color-primary, #3498db); text-decoration: none; font-size: 0.9rem; }
.dataset-access-download { display: inline-block; padding: 12px 24px; background: #3498db; color: #fff; border-radius: 6px; font-weight: 600; text-decoration: none; }
.dataset-access-download:hover { background: #2980b9; }
.dataset-access-meta-list { margin: 0; }
.dataset-access-meta-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.dataset-access-meta-row dt { color: #6b7280; }
.dataset-access-meta-row dd { margin: 0; color: #2c3e50; font-weight: 500; word-break: break-all; }
</style>
