import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { dataset_slug: 'air-quality' } }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../src/api/datasetApi', () => ({
  datasetApi: {
    getDataset: vi.fn(),
  },
}));

// Stub the shared display components so the detail view mounts without fe-core.
vi.mock('vbwd-view-component', () => ({
  TagChips: { template: '<div />' },
  CustomFieldsDisplay: { template: '<div />' },
}));

// The cms plugin's public renderer is a cross-plugin import (see DatasetDetail
// for why it is imported by relative path rather than the `@plugins/cms` alias).
// Mock it with a presentational stub that surfaces the props it was given
// (owner-type + owner-id) so we can assert the contract from the detail page.
vi.mock('../../cms', () => ({
  EntityPageContent: {
    name: 'EntityPageContentStub',
    props: ['ownerType', 'ownerId', 'slot'],
    template:
      '<div data-testid="entity-page-content"' +
      ' :data-owner-type="ownerType" :data-owner-id="ownerId" />',
  },
}));

import DatasetDetail from '../src/views/DatasetDetail.vue';
import { useDatasetStore } from '../src/stores/useDatasetStore';

const tFallback = (key: string) => key;

function mountDetail() {
  return mount(DatasetDetail, {
    global: { mocks: { $t: tFallback }, stubs: { RouterLink: RouterLinkStub } },
  });
}

describe('DatasetDetail — renders the attached CMS entity page (S128)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders EntityPageContent for the loaded dataset with owner-type + owner-id', async () => {
    const store = useDatasetStore();
    vi.spyOn(store, 'fetchDataset').mockResolvedValue(undefined as never);
    store.currentDataset = {
      id: 'ds-42', slug: 'air-quality', title: 'Air Quality', description: 'Live AQ',
      source_attribution: 'EEA', price: 19, tariff_plan_id: null, category_slug: 'env',
      is_active: true, last_taken_at: null,
    };

    const wrapper = mountDetail();
    await flushPromises();

    const entityPage = wrapper.find('[data-testid="entity-page-content"]');
    expect(entityPage.exists()).toBe(true);
    expect(entityPage.attributes('data-owner-type')).toBe('dataset');
    expect(entityPage.attributes('data-owner-id')).toBe('ds-42');
  });

  it('places EntityPageContent immediately after the description block', async () => {
    const store = useDatasetStore();
    vi.spyOn(store, 'fetchDataset').mockResolvedValue(undefined as never);
    store.currentDataset = {
      id: 'ds-42', slug: 'air-quality', title: 'Air Quality', description: 'Live AQ',
      source_attribution: 'EEA', price: 19, tariff_plan_id: null, category_slug: 'env',
      is_active: true, last_taken_at: null,
    };

    const wrapper = mountDetail();
    await flushPromises();

    const html = wrapper.html();
    const descriptionIndex = html.indexOf('dataset-detail-description');
    const entityPageIndex = html.indexOf('entity-page-content');
    expect(descriptionIndex).toBeGreaterThan(-1);
    expect(entityPageIndex).toBeGreaterThan(descriptionIndex);
  });

  it('does not render EntityPageContent when no dataset id is available', async () => {
    const store = useDatasetStore();
    vi.spyOn(store, 'fetchDataset').mockResolvedValue(undefined as never);
    store.currentDataset = null;

    const wrapper = mountDetail();
    await flushPromises();

    expect(wrapper.find('[data-testid="entity-page-content"]').exists()).toBe(false);
  });
});
