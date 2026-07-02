import { describe, it, expect } from 'vitest';
import { datasetInvoiceLink } from '../src/registry/datasetInvoiceLink';

describe('datasetInvoiceLink — invoice line → dataset access page', () => {
  it('maps a DATASET line to the access page using extra_data.dataset_slug', () => {
    const link = datasetInvoiceLink({
      type: 'DATASET',
      extra_data: { dataset_slug: 'air-quality' },
    });
    expect(link).toBe('/dashboard/datasets/air-quality');
  });

  it('maps a CUSTOM line tagged plugin=dataset (payment_metadata.dataset)', () => {
    const link = datasetInvoiceLink({
      type: 'CUSTOM',
      extra_data: { plugin: 'dataset', dataset: { slug: 'traffic' } },
    });
    expect(link).toBe('/dashboard/datasets/traffic');
  });

  // BUG 4 — the exact shape the one-time order endpoint stamps on the CUSTOM
  // line (extra_data.plugin='dataset' + extra_data.dataset_slug) must resolve.
  it('maps the one-time order CUSTOM line (plugin=dataset + dataset_slug)', () => {
    const link = datasetInvoiceLink({
      type: 'CUSTOM',
      extra_data: { plugin: 'dataset', dataset_slug: 'air-quality' },
    });
    expect(link).toBe('/dashboard/datasets/air-quality');
  });

  it('returns null for a non-dataset line (subscription)', () => {
    expect(
      datasetInvoiceLink({ type: 'SUBSCRIPTION', catalog_item_id: 'plan-1' }),
    ).toBeNull();
  });

  it('returns null for a dataset line missing a slug', () => {
    expect(datasetInvoiceLink({ type: 'DATASET', extra_data: {} })).toBeNull();
  });
});
