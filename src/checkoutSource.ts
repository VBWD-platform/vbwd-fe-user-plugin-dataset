/**
 * Dataset checkout source (S110 · BUG 4 — one-time differentiator).
 *
 * Lets the generic public /checkout page buy a dataset ONE-TIME
 * (`/checkout?source=dataset&dataset_slug=<slug>`) without the core checkout
 * store knowing anything about datasets. It loads the dataset, produces a single
 * line item, and submits to the dataset plugin's own one-time order endpoint —
 * which creates an invoice with a CUSTOM `plugin=dataset` line the host invoice
 * detail can fall through to the dataset access page (mirrors booking/shop).
 *
 * Unlike the recurring subscription path (a SUBSCRIPTION line the host links to
 * the plan page), this is a one-time CUSTOM line, so the buyer's invoice line is
 * clickable and reaches /dashboard/datasets/<slug>.
 */
import { defineAsyncComponent, ref } from 'vue';
import { api } from '@/api';
import {
  type CheckoutSource,
  type CheckoutResult,
  type CheckoutRouteContext,
  type LineItem,
} from '@/registries/checkoutSourceRegistry';
import { useAppConfigStore } from '@/stores/appConfig';
import { datasetApi, type Dataset } from './api/datasetApi';

// The dataset being purchased this checkout visit. Resolved by `load()` from the
// route (the click-flow) or the `?dataset_slug=` query (a deep link / refresh).
const selectedDataset = ref<Dataset | null>(null);

/** Resolve the dataset slug from the context, else the current URL query. */
function resolveDatasetSlug(ctx: CheckoutRouteContext): string | null {
  const fromContext = (ctx.dataset_slug as string) || '';
  if (fromContext) return fromContext;
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search).get('dataset_slug');
  }
  return null;
}

export const datasetCheckoutSource: CheckoutSource = {
  id: 'dataset',

  matches: (ctx) => ctx.source === 'dataset',

  async load(ctx): Promise<void> {
    const slug = resolveDatasetSlug(ctx);
    if (!slug) {
      throw new Error('No dataset selected');
    }
    selectedDataset.value = await datasetApi.getDataset(slug);
  },

  getLineItems(): LineItem[] {
    const dataset = selectedDataset.value;
    if (!dataset) {
      return [];
    }
    const currency = useAppConfigStore().defaultCurrency;
    const price = Number(dataset.price ?? 0);
    return [
      {
        type: 'dataset',
        id: dataset.id,
        name: dataset.title,
        price,
        quantity: 1,
        currency,
        total_price: String(price),
      },
    ];
  },

  getOrderTotal: () => Number(selectedDataset.value?.price ?? 0),

  async submit(paymentMethodCode): Promise<CheckoutResult> {
    const dataset = selectedDataset.value;
    if (!dataset) {
      throw new Error('No dataset selected');
    }
    const billingCurrency = useAppConfigStore().defaultCurrency;
    const payload: Record<string, unknown> = { dataset_slug: dataset.slug };
    if (paymentMethodCode) {
      payload.payment_method_code = paymentMethodCode;
    }

    const response = (await api.post('/dataset/orders', payload)) as {
      invoice_id: string;
      invoice_number: string;
      status: string;
      total_amount: string;
      currency: string;
    };

    return {
      invoice: {
        id: response.invoice_id,
        invoice_number: response.invoice_number,
        status: response.status,
        amount: response.total_amount,
        total_amount: response.total_amount,
        currency: response.currency || billingCurrency,
        line_items: [],
      },
      message: 'Order created',
    };
  },

  reset: () => {
    selectedDataset.value = null;
  },

  summaryComponent: defineAsyncComponent(
    () => import('./components/DatasetCheckoutSummary.vue'),
  ),
};
