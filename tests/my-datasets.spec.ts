import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

const mockListMyDatasets = vi.fn();
const mockDownload = vi.fn();

vi.mock('../src/api/datasetApi', () => ({
  datasetApi: {
    listMyDatasets: (...args: unknown[]) => mockListMyDatasets(...args),
    downloadUrl: (slug: string) => `/api/v1/dataset/${slug}/download`,
    download: (...args: unknown[]) => mockDownload(...args),
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
    expect(download.exists()).toBe(true);
    expect(download.element.tagName).toBe('BUTTON');
  });

  it('downloads the snapshot as an auth-carrying blob (not a bare anchor)', async () => {
    mockListMyDatasets.mockResolvedValue([
      { id: 'd1', slug: 'air-quality', title: 'Air Quality', description: null, source_attribution: null, tariff_plan_id: 'p1', category_slug: 'env', is_active: true },
    ]);
    mockDownload.mockResolvedValue({ blob: new Blob(['a,b\n1,2']), filename: 'air-quality.csv' });

    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const wrapper = await mountMyDatasets();
    await wrapper.find('[data-testid="my-datasets-download"]').trigger('click');
    await flushPromises();

    expect(mockDownload).toHaveBeenCalledWith('air-quality');
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('shows the empty state when the user has no dataset access', async () => {
    mockListMyDatasets.mockResolvedValue([]);

    const wrapper = await mountMyDatasets();

    expect(wrapper.find('[data-testid="my-datasets-empty"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="my-datasets-item"]')).toHaveLength(0);
  });
});
