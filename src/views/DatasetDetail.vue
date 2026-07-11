<template>
  <div class="dataset-detail">
    <div
      v-if="store.loading"
      class="dataset-loading"
    >
      {{ $t('dataset.loading') }}
    </div>
    <div
      v-else-if="store.error || !dataset"
      class="dataset-error"
    >
      {{ store.error || $t('dataset.notFound') }}
    </div>

    <template v-else>
      <div class="dataset-detail-header">
        <div class="dataset-detail-meta">
          <h1 class="dataset-detail-name">
            {{ dataset.title }}
          </h1>
          <p
            v-if="dataset.source_attribution"
            class="dataset-detail-source"
          >
            {{ $t('dataset.by') }} {{ dataset.source_attribution }}
          </p>
        </div>
        <div class="dataset-detail-cta">
          <button
            class="dataset-cta-btn"
            data-testid="dataset-get-btn"
            @click="handleGetDataset"
          >
            {{ $t('dataset.getDataset') }}
          </button>
        </div>
      </div>

      <p
        v-if="dataset.description"
        class="dataset-detail-description"
      >
        {{ dataset.description }}
      </p>

      <!-- The operator-attached CMS entity page (body + ordered blocks + scoped
           CSS), rendered by the cms plugin's public presentational renderer. It
           collapses to nothing on 404/absent, so it never breaks this page. -->
      <EntityPageContent
        v-if="dataset && dataset.id"
        owner-type="dataset"
        :owner-id="dataset.id"
      />

      <div
        v-if="hasTagsOrCustomFields"
        class="dataset-tags-custom-fields"
        data-testid="dataset-tags-custom-fields"
      >
        <TagChips
          v-if="dataset.tags && dataset.tags.length"
          :tags="dataset.tags"
        />
        <CustomFieldsDisplay
          v-if="dataset.custom_fields"
          :custom-fields="dataset.custom_fields"
          :field-defs="dataset.custom_field_defs"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { TagChips, CustomFieldsDisplay } from 'vbwd-view-component';
// Public presentational renderer from the cms plugin's package entry. The
// documented S128 alias is `@plugins/cms`; it resolves for vue-tsc + the vite
// runtime, but vitest.config.js aliases only `@`, so the plugin unit suite
// cannot resolve `@plugins` (a host-owned vitest-alias seam). Until that seam
// exists we import the cms public entry (plugins/cms/index.ts) by relative path
// so the dataset plugin is unit-testable without touching host config.
import { EntityPageContent } from '../../../cms';
import { useDatasetStore } from '../stores/useDatasetStore';

const route = useRoute();
const router = useRouter();
const store = useDatasetStore();

const datasetSlug = computed(() => route.params.dataset_slug as string);
const dataset = computed(() => store.currentDataset);

const hasTagsOrCustomFields = computed(() => {
  const current = dataset.value;
  if (!current) return false;
  const hasTags = Array.isArray(current.tags) && current.tags.length > 0;
  const hasFields = !!current.custom_fields && Object.keys(current.custom_fields).length > 0;
  return hasTags || hasFields;
});

function handleGetDataset() {
  const current = dataset.value;
  if (!current) return;
  // One-time purchase: drive the generic checkout via the dataset source, which
  // produces a CUSTOM dataset invoice line (clickable → dataset access page) —
  // NOT a recurring subscription line. This is the S110 differentiator; the old
  // `tarif_plan_id` recurring push produced a SUBSCRIPTION line the host linked
  // to the plan page, never reaching the dataset access page.
  router.push({
    path: '/checkout',
    query: {
      source: 'dataset',
      dataset_slug: current.slug,
    },
  });
}

function load() {
  store.fetchDataset(datasetSlug.value);
}

onMounted(load);
watch(datasetSlug, load);
</script>

<style scoped>
.dataset-detail { max-width: 1100px; margin: 0 auto; padding: 24px 20px; }
.dataset-detail-header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 16px; flex-wrap: wrap; }
.dataset-detail-meta { flex: 1; }
.dataset-detail-name { font-size: 1.8rem; color: #2c3e50; margin: 0 0 4px; }
.dataset-detail-source { color: #6b7280; font-size: 14px; margin: 0 0 10px; }
.dataset-detail-cta { margin-left: auto; }
.dataset-cta-btn { display: inline-block; padding: 12px 24px; background: #3498db; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 15px; }
.dataset-cta-btn:hover { background: #2980b9; }
.dataset-detail-description { color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 28px; }
.dataset-tags-custom-fields { display: flex; flex-direction: column; gap: 12px; }
.dataset-loading, .dataset-error { text-align: center; padding: 60px 20px; color: #6b7280; }
.dataset-error { color: #dc2626; }
</style>
