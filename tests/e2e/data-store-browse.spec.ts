import { test, expect, request as apiRequest, type APIRequestContext } from '@playwright/test';
import {
  loginAdmin,
  seedDatasetFixture,
  cleanupDatasetFixture,
  type DatasetFixture,
} from './support/datasetFixtures';

/**
 * S152-00 — public Data-store browse journey: catalogue index → category list →
 * dataset detail. Anonymous (the catalogue is public). The dataset is seeded via
 * the admin API and removed afterwards.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

let api: APIRequestContext;
let adminToken: string;
let fixture: DatasetFixture | undefined;

test.describe('Data store — browse catalogue → category → detail', () => {
  test.beforeAll(async () => {
    api = await apiRequest.newContext({ baseURL: BASE_URL });
    adminToken = await loginAdmin(api);
    fixture = await seedDatasetFixture(api, adminToken, 'browse');
  });

  test.afterAll(async () => {
    await cleanupDatasetFixture(api, adminToken, fixture, []);
    await api.dispose();
  });

  test('the catalogue index lists the category and links to its dataset list', async ({ page }) => {
    const seeded = fixture as DatasetFixture;
    await page.goto('/data-store');

    const index = page.locator('[data-testid="dataset-catalogue-index"]');
    await expect(index).toBeVisible();
    const categoryLink = index.locator(`a[href="/data-store/${seeded.categorySlug}"]`);
    await expect(categoryLink).toBeVisible();

    await categoryLink.click();
    await expect(page).toHaveURL(`/data-store/${seeded.categorySlug}`);
    await expect(page.locator('[data-testid="dataset-catalogue-list"]')).toBeVisible();
  });

  test('a dataset card in the category opens the public dataset detail', async ({ page }) => {
    const seeded = fixture as DatasetFixture;
    await page.goto(`/data-store/${seeded.categorySlug}`);

    const card = page.locator(
      `[data-testid="dataset-card"][href="/data-store/${seeded.categorySlug}/${seeded.datasetSlug}"]`,
    );
    await expect(card).toBeVisible();
    await card.click();

    await expect(page).toHaveURL(`/data-store/${seeded.categorySlug}/${seeded.datasetSlug}`);
    await expect(page.locator('h1.dataset-detail-name')).toHaveText(seeded.datasetTitle);
    await expect(page.locator('[data-testid="dataset-get-btn"]')).toBeVisible();
  });
});
