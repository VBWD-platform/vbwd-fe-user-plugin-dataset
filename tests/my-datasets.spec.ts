import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const mockListMyDatasets = vi.fn();

vi.mock('../src/api/datasetApi', () => ({
  datasetApi: {
    listMyDatasets: (...args: unknown[]) => mockListMyDatasets(...args),
    downloadUrl: (slug: string) => `/api/v1/dataset/${slug}/download`,
  },
}));

import MyDatasets from '../src/components/MyDatasets.vue';

const tFallback = (key: string) => key;

async function mountMyDatasets() {
  const wrapper = mount(MyDatasets, {
    global: {
      mocks: { $t: tFallback },
      stubs: { RouterLink: RouterLinkStub },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('MyDatasets — entitled datasets + download', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('lists the entitled datasets with an open link and a download button', async () => {
    mockListMyDatasets.mockResolvedValue([
      { id: 'd1', slug: 'air-quality', title: 'Air Quality', description: null, source_attribution: null, tariff_plan_id: 'p1', category_slug: 'env', is_active: true },
      { id: 'd2', slug: 'traffic', title: 'Traffic', description: null, source_attribution: null, tariff_plan_id: 'p2', category_slug: 'mobility', is_active: true },
    ]);

    const wrapper = await mountMyDatasets();

    const items = wrapper.findAll('[data-testid="my-datasets-item"]');
    expect(items).toHaveLength(2);
    expect(wrapper.text()).toContain('Air Quality');

    const openLink = wrapper.findAllComponents(RouterLinkStub).find(
      (link) => link.props('to') === '/dashboard/datasets/air-quality',
    );
    expect(openLink).toBeDefined();

    const download = wrapper.find('[data-testid="my-datasets-download"]');
    expect(download.attributes('href')).toBe('/api/v1/dataset/air-quality/download');
  });

  it('shows the empty state when the user has no dataset access', async () => {
    mockListMyDatasets.mockResolvedValue([]);

    const wrapper = await mountMyDatasets();

    expect(wrapper.find('[data-testid="my-datasets-empty"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="my-datasets-item"]')).toHaveLength(0);
  });
});
