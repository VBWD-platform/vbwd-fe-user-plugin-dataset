import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const mockPush = vi.fn();

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { category_slug: 'env', dataset_slug: 'air-quality' } }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('../src/api/datasetApi', () => ({
  datasetApi: {
    getCategories: vi.fn(async () => ({ categories: [{ slug: 'env', label: 'Environment' }] })),
  },
}));

// Stub the shared display components so the detail view mounts without fe-core.
vi.mock('vbwd-view-component', () => ({
  TagChips: { template: '<div />' },
  CustomFieldsDisplay: { template: '<div />' },
}));

import DatasetCatalogue from '../src/views/DatasetCatalogue.vue';
import DatasetDetail from '../src/views/DatasetDetail.vue';
import { useDatasetStore } from '../src/stores/useDatasetStore';

const tFallback = (key: string) => key;

describe('DatasetCatalogue — Data store listing + category filter', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches datasets for the selected category and renders cards linking to detail', async () => {
    const store = useDatasetStore();
    const fetchSpy = vi.spyOn(store, 'fetchDatasets').mockImplementation(async () => {
      store.datasets = {
        items: [
          { id: 'd1', slug: 'air-quality', title: 'Air Quality', description: null, source_attribution: 'EEA', price: 19, tariff_plan_id: 'p1', category_slug: 'env', is_active: true },
        ],
        total: 1,
        page: 1,
        per_page: 20,
        pages: 1,
      };
    });

    const wrapper = mount(DatasetCatalogue, {
      global: { mocks: { $t: tFallback }, stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();

    // Filters the list by the dataset_category term (category_slug param).
    expect(fetchSpy).toHaveBeenCalled();
    expect(fetchSpy.mock.calls[0][0]).toMatchObject({ category_slug: 'env' });

    const cards = wrapper.findAll('[data-testid="dataset-card"]');
    expect(cards).toHaveLength(1);
    expect(wrapper.text()).toContain('Air Quality');

    const card = wrapper.findAllComponents(RouterLinkStub).find(
      (link) => link.props('to') === '/data-store/env/air-quality',
    );
    expect(card).toBeDefined();
  });
});

describe('DatasetDetail — routes to the one-time dataset checkout', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // BUG 4 regression — "Get dataset" drives the ONE-TIME checkout source
  // (`?source=dataset&dataset_slug=…`), NOT the recurring `tarif_plan_id` push
  // (whose SUBSCRIPTION line never reached the dataset access page).
  it('pushes /checkout with source=dataset + dataset_slug on Get Dataset', async () => {
    const store = useDatasetStore();
    vi.spyOn(store, 'fetchDataset').mockResolvedValue(undefined as never);
    store.currentDataset = {
      id: 'd1', slug: 'air-quality', title: 'Air Quality', description: 'Live AQ',
      source_attribution: 'EEA', price: 19, tariff_plan_id: 'plan-aq', category_slug: 'env',
      is_active: true, last_taken_at: null,
    };

    const wrapper = mount(DatasetDetail, {
      global: { mocks: { $t: tFallback }, stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();

    await wrapper.find('[data-testid="dataset-get-btn"]').trigger('click');

    expect(mockPush).toHaveBeenCalledWith({
      path: '/checkout',
      query: { source: 'dataset', dataset_slug: 'air-quality' },
    });
  });
});
