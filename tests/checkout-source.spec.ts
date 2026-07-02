/**
 * BUG 4 regression (fe-user) — the dataset checkout source drives a ONE-TIME
 * purchase through the generic /checkout page, producing a dataset line and
 * submitting to the plugin's own one-time order endpoint (which creates the
 * CUSTOM `plugin=dataset` invoice line the host invoice detail links to the
 * dataset access page). The old flow pushed a recurring `tarif_plan_id` checkout
 * whose SUBSCRIPTION line never reached the access page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api', () => ({ api: { post: vi.fn() } }));
vi.mock('@/stores/appConfig', () => ({
  useAppConfigStore: () => ({ defaultCurrency: 'EUR' }),
}));

import { api } from '@/api';
import { datasetCheckoutSource } from '../src/checkoutSource';

const DATASET = {
  id: 'ds-1',
  slug: 'air-quality',
  title: 'Air Quality',
  description: null,
  source_attribution: null,
  price: 19,
  tariff_plan_id: null,
  category_slug: null,
  is_active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  datasetCheckoutSource.reset();
  global.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => DATASET }) as never;
});

describe('datasetCheckoutSource — one-time dataset purchase', () => {
  it('matches only source=dataset', () => {
    expect(datasetCheckoutSource.matches({ source: 'dataset' })).toBe(true);
    expect(datasetCheckoutSource.matches({ source: 'shop' })).toBe(false);
    expect(datasetCheckoutSource.matches({})).toBe(false);
  });

  it('loads the dataset and produces exactly one dataset line item', async () => {
    await datasetCheckoutSource.load({ source: 'dataset', dataset_slug: 'air-quality' });
    const items = datasetCheckoutSource.getLineItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: 'dataset',
      id: 'ds-1',
      name: 'Air Quality',
      price: 19,
      quantity: 1,
    });
    expect(datasetCheckoutSource.getOrderTotal()).toBe(19);
  });

  it('submits to the one-time order endpoint and returns the invoice', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      invoice_id: 'inv-1',
      invoice_number: 'DS-ABC12345',
      status: 'PENDING',
      total_amount: '19.00',
      currency: 'EUR',
    });
    await datasetCheckoutSource.load({ source: 'dataset', dataset_slug: 'air-quality' });
    const result = await datasetCheckoutSource.submit('token_balance');
    expect(api.post).toHaveBeenCalledWith('/dataset/orders', {
      dataset_slug: 'air-quality',
      payment_method_code: 'token_balance',
    });
    expect(result.invoice.id).toBe('inv-1');
    expect(result.invoice.invoice_number).toBe('DS-ABC12345');
    expect(result.invoice.status).toBe('PENDING');
  });

  it('throws when no dataset slug can be resolved', async () => {
    await expect(
      datasetCheckoutSource.load({ source: 'dataset' } as never),
    ).rejects.toThrow();
  });
});
