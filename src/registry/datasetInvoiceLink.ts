/**
 * Invoice line-item → dataset access-page resolver (S110, T11).
 *
 * The fe-user invoice detail (`vue/src/views/InvoiceDetail.vue`) resolves a
 * clickable link per line via a HARD-CODED `itemLink()` switch (SUBSCRIPTION /
 * TOKEN_BUNDLE / ADD_ON / CUSTOM+booking). There is currently **no** generic
 * plugin seam to contribute a per-type link, so a dataset line cannot be made
 * clickable without a core edit — which this plugin must not do.
 *
 * This module is the plugin's seam-ready contribution: a pure resolver that maps
 * a dataset invoice line to `/dashboard/datasets/<slug>`. Once core exposes a
 * generic `invoiceLineLinkRegistry` (requested from the core/host agent), wiring
 * is a one-liner: `invoiceLineLinkRegistry.register(datasetInvoiceLink)`.
 *
 * The backend line carries `resolve_catalog_entity_ref → ("dataset", id)` and a
 * `payment_metadata.dataset` blob; the slug is read from `extra_data`.
 */

export interface InvoiceLineItemLike {
  type?: string;
  catalog_item_id?: string;
  item_id?: string;
  // The backend serialises the line's `extra_data` JSON under the `metadata`
  // key (core `InvoiceLineItem.to_dict()`); older/unit shapes use `extra_data`.
  // Read both so the resolver works against the real API payload.
  extra_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

function lineExtra(item: InvoiceLineItemLike): Record<string, unknown> {
  return item.metadata ?? item.extra_data ?? {};
}

function readDatasetSlug(item: InvoiceLineItemLike): string | undefined {
  const extra = lineExtra(item);
  const directSlug = (extra.dataset_slug ?? extra.slug) as string | undefined;
  if (directSlug) return directSlug;
  const dataset = extra.dataset as { slug?: string } | undefined;
  return dataset?.slug;
}

/**
 * Resolve a dataset invoice line to its access page, or `null` for any other
 * line type (so a consuming registry can fall through to the next resolver).
 */
export function datasetInvoiceLink(item: InvoiceLineItemLike): string | null {
  const type = item.type?.toUpperCase();
  const isDatasetLine =
    type === 'DATASET' ||
    (type === 'CUSTOM' && lineExtra(item).plugin === 'dataset');
  if (!isDatasetLine) return null;

  const slug = readDatasetSlug(item);
  return slug ? `/dashboard/datasets/${slug}` : null;
}
