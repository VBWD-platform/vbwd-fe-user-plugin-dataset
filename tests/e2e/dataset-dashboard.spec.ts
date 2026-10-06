import { test, expect, request as apiRequest, type APIRequestContext } from '@playwright/test';
import {
  loginAdmin,
  loginTestUserThroughApi,
  loginTestUserInBrowser,
  seedDatasetFixture,
  cleanupDatasetFixture,
  markInvoicePaid,
  type DatasetFixture,
} from './support/datasetFixtures';

/**
 * S152-00 — a paid one-time dataset purchase is visible on the SPA
 * `/dashboard/datasets` ("My datasets") and opens the dataset access page.
 *
 * The purchase is made through the same public API the checkout source calls
 * (`POST /api/v1/dataset/orders`) and captured admin-side (`mark-paid` fires
 * `invoice.paid`, which grants the dataset membership). The browser leg of the
 * checkout itself is covered by dataset-checkout.spec.ts.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

let api: APIRequestContext;
let adminToken: string;
let fixture: DatasetFixture | undefined;
const createdInvoiceIds: string[] = [];

test.describe('Dataset dashboard — purchase visible on /dashboard/datasets', () => {
  test.beforeAll(async () => {
    api = await apiRequest.newContext({ baseURL: BASE_URL });
    adminToken = await loginAdmin(api);
    fixture = await seedDatasetFixture(api, adminToken, 'dashboard');

    const userToken = await loginTestUserThroughApi(api);
    const orderResponse = await api.post('/api/v1/dataset/orders', {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { dataset_slug: fixture.datasetSlug },
    });
    if (!orderResponse.ok()) {
      throw new Error(`dataset order failed: ${orderResponse.status()} ${await orderResponse.text()}`);
    }
    const order = await orderResponse.json();
    createdInvoiceIds.push(order.invoice_id);
    await markInvoicePaid(api, adminToken, order.invoice_id);
  });

  test.afterAll(async () => {
    await cleanupDatasetFixture(api, adminToken, fixture, createdInvoiceIds);
    await api.dispose();
  });

  test('the paid dataset is listed under My datasets and opens its access page', async ({ page }) => {
    const seeded = fixture as DatasetFixture;
    await loginTestUserInBrowser(page);
    await page.goto('/dashboard/datasets');

    await expect(page.locator('[data-testid="my-datasets"]')).toBeVisible();
    const purchasedItem = page
      .locator('[data-testid="my-datasets-item"]')
      .filter({ hasText: seeded.datasetTitle });
    await expect(purchasedItem).toBeVisible();

    await purchasedItem.locator('[data-testid="my-datasets-open"]').click();
    await expect(page).toHaveURL(`/dashboard/datasets/${seeded.datasetSlug}`);
  });
});
