<template>
  <div
    class="my-datasets"
    data-testid="my-datasets"
  >
    <h2 class="my-datasets-title">
      {{ $t('dataset.myDatasets.title') }}
    </h2>

    <div
      v-if="store.loading"
      class="my-datasets-loading"
    >
      {{ $t('dataset.loading') }}
    </div>
    <div
      v-else-if="!store.myDatasets.length"
      class="my-datasets-empty"
      data-testid="my-datasets-empty"
    >
      {{ $t('dataset.myDatasets.empty') }}
      <router-link
        to="/data-store"
        class="my-datasets-browse"
      >
        {{ $t('dataset.myDatasets.browse') }}
      </router-link>
    </div>
    <ul
      v-else
      class="my-datasets-list"
    >
      <li
        v-for="dataset in store.myDatasets"
        :key="dataset.id"
        class="my-datasets-item"
        data-testid="my-datasets-item"
      >
        <router-link
          :to="`/dashboard/datasets/${dataset.slug}`"
          class="my-datasets-name"
          data-testid="my-datasets-open"
        >
          {{ dataset.title }}
        </router-link>
        <a
          :href="downloadHref(dataset.slug)"
          class="my-datasets-download"
          data-testid="my-datasets-download"
          download
        >
          {{ $t('dataset.myDatasets.download') }}
        </a>
      </li>
    </ul>

    <div class="my-datasets-keys">
      <router-link
        to="/dashboard/api-keys"
        class="my-datasets-manage-keys"
        data-testid="my-datasets-manage-keys"
      >
        {{ $t('dataset.myDatasets.manageKeys') }}
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useDatasetStore } from '../stores/useDatasetStore';
import { datasetApi } from '../api/datasetApi';

const store = useDatasetStore();

function downloadHref(slug: string): string {
  // The `last` snapshot download is session-auth (attachment) — no API key
  // needed, so a plain browser navigation works.
  return datasetApi.downloadUrl(slug);
}

onMounted(() => {
  store.fetchMyDatasets();
});
</script>

<style scoped>
.my-datasets { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,.05); }
.my-datasets-title { font-size: 1.1rem; color: #2c3e50; margin: 0 0 16px; }
.my-datasets-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.my-datasets-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 1px solid #eef0f2; border-radius: 6px; }
.my-datasets-name { color: var(--vbwd-color-primary, #3498db); text-decoration: none; font-weight: 600; }
.my-datasets-name:hover { text-decoration: underline; }
.my-datasets-download { font-size: 0.85rem; color: #2c3e50; text-decoration: none; padding: 6px 12px; background: #ecf0f1; border-radius: 4px; }
.my-datasets-download:hover { background: #dfe4e6; }
.my-datasets-empty { color: #6b7280; padding: 24px 0; text-align: center; }
.my-datasets-browse { display: inline-block; margin-left: 6px; color: var(--vbwd-color-primary, #3498db); }
.my-datasets-loading { color: #9ca3af; padding: 24px 0; text-align: center; }
.my-datasets-keys { margin-top: 16px; padding-top: 12px; border-top: 1px solid #eef0f2; }
.my-datasets-manage-keys { color: var(--vbwd-color-primary, #3498db); text-decoration: none; font-size: 0.9rem; }
</style>
