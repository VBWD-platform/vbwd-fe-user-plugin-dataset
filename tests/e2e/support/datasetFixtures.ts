/**
 * S152-00 — shared E2E fixtures for the dataset journeys (browse, one-time
 * checkout, "My datasets"). Everything is seeded through the admin API (no raw
 * SQL) and torn down again, so the specs are self-cleaning and run from a cold
 * stack that has no demo datasets.
 *
 * The fixture is one dedicated, active, paid dataset assigned to a
 * `dataset_category` term. An existing category term is reused when present;
 * otherwise a fixture term is created (and removed again on cleanup).
 */
import type { APIRequestContext, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'AdminPass123@';

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL ?? 'test@example.com',
  password: process.env.TEST_USER_PASSWORD ?? 'TestPass123@',
};

const DATASET_CATEGORY_TERM_TYPE = 'dataset_category';
const FIXTURE_CATEGORY_SLUG = 's152-e2e-dataset-category';
const FIXTURE_DATASET_PRICE = 7;

export interface DatasetFixture {
  datasetId: string;
  datasetSlug: string;
  datasetTitle: string;
  categorySlug: string;
  /** Set when the fixture created its own category term (removed on cleanup). */
  createdCategoryTermId: string | null;
}

interface CategoryIndexEntry {
  id: string;
  slug: string;
  label: string;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function loginThroughApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const response = await request.post('/api/v1/auth/login', { data: { email, password } });
  if (!response.ok()) {
    throw new Error(`login failed for ${email}: ${response.status()} ${await response.text()}`);
  }
  const body = await response.json();
  const token = body.token ?? body.access_token;
  if (!token) throw new Error(`login for ${email} returned no token`);
  return token;
}

export function loginAdmin(request: APIRequestContext): Promise<string> {
  return loginThroughApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
}

export function loginTestUserThroughApi(request: APIRequestContext): Promise<string> {
  return loginThroughApi(request, TEST_USER.email, TEST_USER.password);
}

/** Log the test user in through the SPA login form (sets the SPA session keys). */
export async function loginTestUserInBrowser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', TEST_USER.email);
  await page.fill('[data-testid="password"]', TEST_USER.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
}

/**
 * Complete the generic public /checkout form with the `invoice` payment method:
 * billing address, payment method, terms — until the confirm button enables.
 */
export async function completeCheckoutWithInvoiceMethod(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="billing-street"]');
  await page.fill('[data-testid="billing-first-name"]', 'Test');
  await page.fill('[data-testid="billing-last-name"]', 'Buyer');
  await page.fill('[data-testid="billing-street"]', '123 Test Street');
  await page.fill('[data-testid="billing-city"]', 'Test City');
  await page.fill('[data-testid="billing-zip"]', '12345');
  await page.locator('[data-testid="billing-country"]').selectOption({ index: 1 });

  await page.locator('[data-testid="payment-method-invoice"]').click();
  await page.locator('[data-testid="terms-checkbox"] input[type="checkbox"]').check();
  await page.waitForSelector('[data-testid="confirm-checkout"]:not([disabled])');
}

async function resolveCategory(
  request: APIRequestContext,
  adminToken: string,
): Promise<{ id: string; slug: string; created: boolean }> {
  const indexResponse = await request.get('/api/v1/dataset/categories');
  const index = ((await indexResponse.json()).categories ?? []) as CategoryIndexEntry[];
  if (index.length > 0) {
    return { id: index[0].id, slug: index[0].slug, created: false };
  }
  const createResponse = await request.post('/api/v1/admin/cms/terms', {
    headers: authHeaders(adminToken),
    data: {
      term_type: DATASET_CATEGORY_TERM_TYPE,
      slug: FIXTURE_CATEGORY_SLUG,
      name: 'S152 E2E datasets',
    },
  });
  if (!createResponse.ok()) {
    throw new Error(`category term create failed: ${createResponse.status()} ${await createResponse.text()}`);
  }
  const term = await createResponse.json();
  return { id: term.id, slug: term.slug, created: true };
}

/** Create a dedicated active dataset in a category. `slugSuffix` keeps specs apart. */
export async function seedDatasetFixture(
  request: APIRequestContext,
  adminToken: string,
  slugSuffix: string,
): Promise<DatasetFixture> {
  const category = await resolveCategory(request, adminToken);
  const datasetSlug = `s152-e2e-dataset-${slugSuffix}-${Date.now()}`;
  const datasetTitle = `S152 E2E Dataset ${slugSuffix}`;

  const createResponse = await request.post('/api/v1/admin/datasets', {
    headers: authHeaders(adminToken),
    data: {
      slug: datasetSlug,
      title: datasetTitle,
      description: 'Dataset seeded by the S152-00 e2e baseline; removed after the run.',
      source_attribution: 'S152 e2e fixture',
      price: FIXTURE_DATASET_PRICE,
      is_active: true,
    },
  });
  if (!createResponse.ok()) {
    throw new Error(`dataset create failed: ${createResponse.status()} ${await createResponse.text()}`);
  }
  const dataset = await createResponse.json();

  const assignResponse = await request.post(`/api/v1/admin/datasets/${dataset.id}/categories`, {
    headers: authHeaders(adminToken),
    data: { term_id: category.id },
  });
  if (!assignResponse.ok()) {
    throw new Error(`category assign failed: ${assignResponse.status()} ${await assignResponse.text()}`);
  }

  return {
    datasetId: dataset.id,
    datasetSlug,
    datasetTitle,
    categorySlug: category.slug,
    createdCategoryTermId: category.created ? category.id : null,
  };
}

/** Admin-side capture of a pending invoice (fires `invoice.paid` → dataset grant). */
export async function markInvoicePaid(
  request: APIRequestContext,
  adminToken: string,
  invoiceId: string,
): Promise<void> {
  const response = await request.post(`/api/v1/admin/invoices/${invoiceId}/mark-paid`, {
    headers: authHeaders(adminToken),
    data: { payment_reference: 'S152-E2E', payment_method: 'manual' },
  });
  if (!response.ok()) {
    throw new Error(`mark-paid failed: ${response.status()} ${await response.text()}`);
  }
}

/** Remove every invoice the spec created, then the dataset (memberships cascade). */
export async function cleanupDatasetFixture(
  request: APIRequestContext,
  adminToken: string,
  fixture: DatasetFixture | undefined,
  createdInvoiceIds: string[],
): Promise<void> {
  for (const invoiceId of createdInvoiceIds) {
    await request.delete(`/api/v1/admin/invoices/${invoiceId}`, { headers: authHeaders(adminToken) });
  }
  if (!fixture) return;
  await request.delete(`/api/v1/admin/datasets/${fixture.datasetId}`, {
    headers: authHeaders(adminToken),
  });
  if (fixture.createdCategoryTermId) {
    await request.delete(`/api/v1/admin/cms/terms/${fixture.createdCategoryTermId}`, {
      headers: authHeaders(adminToken),
    });
  }
}
