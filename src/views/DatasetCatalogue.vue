<template>
  <!-- Dataset list when a category is selected -->
  <div
    v-if="categorySlug"
    class="dataset-catalogue"
    data-testid="dataset-catalogue-list"
  >
    <div class="dataset-list-header">
      <h1 class="dataset-list-title">
        {{ categoryLabel }}
      </h1>
      <div class="dataset-list-controls">
        <input
          v-model="searchQuery"
          class="dataset-search-input"
          type="text"
          :placeholder="$t('dataset.search')"
          data-testid="dataset-search"
          @input="onSearch"
        >
      </div>
    </div>

    <div
      v-if="store.loading"
      class="dataset-loading"
    >
      {{ $t('dataset.loading') }}
    </div>
    <div
      v-else-if="store.error"
      class="dataset-error"
    >
      {{ store.error }}
    </div>
    <div
      v-else-if="!items.length"
      class="dataset-empty"
    >
      {{ $t('dataset.noDatasets') }}
    </div>
    <div
      v-else
      class="dataset-grid"
    >
      <router-link
        v-for="dataset in items"
        :key="dataset.id"
        :to="`/data-store/${categorySlug}/${dataset.slug}`"
        class="dataset-card"
        data-testid="dataset-card"
      >
        <div class="dataset-card-info">
          <span class="dataset-card-name">{{ dataset.title }}</span>
          <span
            v-if="dataset.source_attribution"
            class="dataset-card-source"
          >{{ $t('dataset.by') }} {{ dataset.source_attribution }}</span>
        </div>
      </router-link>
    </div>

    <div
      v-if="totalPages > 1"
      class="dataset-pagination"
    >
      <button
        :disabled="currentPage <= 1"
        @click="goToPage(currentPage - 1)"
      >
        &larr;
      </button>
      <span>{{ currentPage }} / {{ totalPages }}</span>
      <button
        :disabled="currentPage >= totalPages"
        @click="goToPage(currentPage + 1)"
      >
        &rarr;
      </button>
    </div>
  </div>

  <!-- Category index at the /data-store root -->
  <div
    v-else
    class="dataset-category-index"
    data-testid="dataset-catalogue-index"
  >
    <h1 class="dataset-category-index__title">
      {{ $t('dataset.title') }}
    </h1>
    <div class="dataset-category-grid">
      <router-link
        v-for="category in categories"
        :key="category.slug"
        :to="`/data-store/${category.slug}`"
        class="dataset-category-card"
      >
        <h2 class="dataset-category-card__title">
          {{ category.label }}
        </h2>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useDatasetStore } from '../stores/useDatasetStore';
import { datasetApi, type DatasetCategory } from '../api/datasetApi';

const route = useRoute();
const store = useDatasetStore();

const categorySlug = computed(() => route.params.category_slug as string | undefined);
const categories = ref<DatasetCategory[]>([]);
const searchQuery = ref('');
const currentPage = ref(1);

const items = computed(() => store.datasets?.items || []);
const totalPages = computed(() => store.datasets?.pages || 1);

const categoryLabel = computed(() => {
  if (!categorySlug.value) return '';
  const found = categories.value.find((category) => category.slug === categorySlug.value);
  return (
    found?.label ??
    categorySlug.value.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
  );
});

function loadDatasets() {
  const params: Record<string, string> = {
    category_slug: categorySlug.value!,
    page: String(currentPage.value),
  };
  if (searchQuery.value) params.q = searchQuery.value;
  store.fetchDatasets(params);
}

async function loadCategories() {
  try {
    const data = await datasetApi.getCategories();
    categories.value = data.categories;
  } catch {
    categories.value = [];
  }
}

function onSearch() {
  currentPage.value = 1;
  loadDatasets();
}

function goToPage(page: number) {
  currentPage.value = page;
  loadDatasets();
}

onMounted(() => {
  loadCategories();
  if (categorySlug.value) loadDatasets();
});

watch(categorySlug, (slug) => {
  currentPage.value = 1;
  searchQuery.value = '';
  if (slug) loadDatasets();
});
</script>

<style scoped>
.dataset-category-index { max-width: 960px; margin: 40px auto; padding: 0 20px; }
.dataset-category-index__title { font-size: 2rem; margin-bottom: 32px; color: #2c3e50; }
.dataset-category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
.dataset-category-card { display: block; padding: 28px; background: #fff; border: 2px solid #e9ecef; border-radius: 10px; text-decoration: none; transition: all 0.2s; }
.dataset-category-card:hover { border-color: #3498db; box-shadow: 0 4px 16px rgba(52,152,219,.12); transform: translateY(-2px); }
.dataset-category-card__title { font-size: 1.2rem; color: #2c3e50; margin: 0; }
.dataset-catalogue { max-width: 1100px; margin: 0 auto; padding: 20px; }
.dataset-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.dataset-list-title { font-size: 1.6rem; color: #2c3e50; margin: 0; }
.dataset-list-controls { display: flex; gap: 8px; align-items: center; }
.dataset-search-input { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; width: 200px; }
.dataset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.dataset-card { display: flex; flex-direction: column; gap: 8px; padding: 20px; background: #fff; border: 1px solid #e9ecef; border-radius: 8px; text-decoration: none; transition: all .2s; }
.dataset-card:hover { border-color: #3498db; box-shadow: 0 2px 12px rgba(52,152,219,.1); }
.dataset-card-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.dataset-card-name { font-weight: 600; color: #2c3e50; font-size: 15px; }
.dataset-card-source { font-size: 12px; color: #6b7280; }
.dataset-pagination { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 24px; }
.dataset-pagination button { padding: 6px 14px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; cursor: pointer; }
.dataset-pagination button:disabled { opacity: .4; cursor: default; }
.dataset-loading, .dataset-error, .dataset-empty { text-align: center; padding: 48px 20px; color: #6b7280; }
.dataset-error { color: #dc2626; }
</style>
