import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  datasetApi,
  type Dataset,
  type DatasetListItem,
  type DatasetPaginated,
} from '../api/datasetApi';

export const useDatasetStore = defineStore('dataset', () => {
  const datasets = ref<DatasetPaginated<DatasetListItem> | null>(null);
  const currentDataset = ref<Dataset | null>(null);
  const myDatasets = ref<DatasetListItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchDatasets(params: Record<string, string> = {}) {
    loading.value = true;
    error.value = null;
    try {
      datasets.value = await datasetApi.listDatasets(params);
    } catch (caught) {
      error.value = (caught as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchDataset(slug: string) {
    loading.value = true;
    error.value = null;
    currentDataset.value = null;
    try {
      currentDataset.value = await datasetApi.getDataset(slug);
    } catch (caught) {
      error.value = (caught as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMyDatasets() {
    loading.value = true;
    error.value = null;
    try {
      myDatasets.value = await datasetApi.listMyDatasets();
    } catch (caught) {
      error.value = (caught as Error).message;
      myDatasets.value = [];
    } finally {
      loading.value = false;
    }
  }

  return {
    datasets,
    currentDataset,
    myDatasets,
    loading,
    error,
    fetchDatasets,
    fetchDataset,
    fetchMyDatasets,
  };
});
