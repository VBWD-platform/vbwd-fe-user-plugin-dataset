import { test, expect, request as apiRequest, type APIRequestContext } from '@playwright/test';
import {
  loginAdmin,
  loginTestUserInBrowser,
  seedDatasetFixture,
  cleanupDatasetFixture,
  completeCheckoutWithInvoiceMethod,
  type DatasetFixture,
} from './support/datasetFixtures';

/**
 * S152-00 — one-time dataset purchase through the generic public checkout:
 * detail "Get dataset" → `/checkout?source=dataset&dataset_slug=…` → invoice
 * payment method → `/checkout/confirmation`. The dataset and the invoice the
 * purchase creates are removed afterwards.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const CONFIRMATION_URL = /\/checkout\/confirmation\?invoice_id=([0-9a-f-]+)/;

let api: APIRequestContext;
let adminToken: string;
let fixture: DatasetFixture | undefined;
const createdInvoiceIds: string[] = [];

test.describe('Dataset checkout — ?source=dataset → invoice → confirmation', () => {
  test.beforeAll(async () => {
    api = await apiRequest.newContext({ baseURL: BASE_URL });
    adminToken = await loginAdmin(api);
    fixture = await seedDatasetFixture(api, adminToken, 'checkout');
  });

  test.afterAll(async () => {
    await cleanupDatasetFixture(api, adminToken, fixture, createdInvoiceIds);
    await api.dispose();
  });

  test('the detail CTA opens the dataset checkout source with the dataset line', async ({ page }) => {
    const seeded = fixture as DatasetFixture;
    await loginTestUserInBrowser(page);
    await page.goto(`/data-store/${seeded.categorySlug}/${seeded.datasetSlug}`);

    await page.locator('[data-testid="dataset-get-btn"]').click();

    await expect(page).toHaveURL(
      new RegExp(`/checkout\\?source=dataset&dataset_slug=${seeded.datasetSlug}$`),
    );
    await expect(
      page.locator(`[data-testid="dataset-line-item-${seeded.datasetId}"]`),
    ).toContainText(seeded.datasetTitle);
  });

  test('paying by invoice lands on the confirmation page with the invoice', async ({ page }) => {
    const seeded = fixture as DatasetFixture;
    await loginTestUserInBrowser(page);
    await page.goto(`/checkout?source=dataset&dataset_slug=${seeded.datasetSlug}`);
    await expect(page.locator(`[data-testid="dataset-line-item-${seeded.datasetId}"]`)).toBeVisible();

    await completeCheckoutWithInvoiceMethod(page);
    await page.locator('[data-testid="confirm-checkout"]').click();

    await page.waitForURL(CONFIRMATION_URL);
    const invoiceId = CONFIRMATION_URL.exec(page.url())?.[1];
    expect(invoiceId).toBeTruthy();
    createdInvoiceIds.push(invoiceId as string);

    await expect(page.locator('[data-testid="confirmation-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="invoice-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="line-item-row"]')).toContainText(seeded.datasetTitle);
  });
});
