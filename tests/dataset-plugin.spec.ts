import { describe, it, expect, beforeEach, vi } from 'vitest';
import { datasetPlugin } from '../index';
import { userNavRegistry } from '@/plugins/userNavRegistry';

interface AddedRoute {
  path: string;
  name: string;
  meta?: Record<string, unknown>;
}

function makeSdkSpy() {
  return {
    addRoute: vi.fn(),
    addTranslations: vi.fn(),
    addComponent: vi.fn(),
  };
}

const ALL_APP_LOCALES = ['de', 'en', 'es', 'fr', 'ja', 'ru', 'th', 'zh'];

describe('dataset plugin registration', () => {
  beforeEach(() => {
    userNavRegistry.unregister('dataset');
  });

  it('is a named export honouring the IPlugin contract', () => {
    expect(datasetPlugin.name).toBe('dataset');
    expect(typeof datasetPlugin.install).toBe('function');
    expect(typeof datasetPlugin.activate).toBe('function');
    expect(typeof datasetPlugin.deactivate).toBe('function');
  });

  it('registers translations for every app locale', () => {
    const sdk = makeSdkSpy();
    datasetPlugin.install!(sdk as never);
    const registeredLocales = sdk.addTranslations.mock.calls.map((call) => call[0]);
    for (const locale of ALL_APP_LOCALES) {
      expect(registeredLocales).toContain(locale);
    }
  });

  it('registers the Data-store, My-datasets and access-detail routes', () => {
    const sdk = makeSdkSpy();
    datasetPlugin.install!(sdk as never);
    const routes: AddedRoute[] = sdk.addRoute.mock.calls.map((call) => call[0] as AddedRoute);
    const paths = routes.map((route) => route.path);

    expect(paths).toContain('/data-store');
    expect(paths).toContain('/data-store/:category_slug');
    expect(paths).toContain('/data-store/:category_slug/:dataset_slug');
    expect(paths).toContain('/dashboard/datasets');
    expect(paths).toContain('/dashboard/datasets/:slug');
  });

  // BUG 5 regression — the My-datasets + access pages are AUTH-only and gated by
  // backend entitlement (a DatasetMembership), NOT the `dataset.view` ADMIN
  // permission. Gating on that permission bounced legitimate buyers.
  it('leaves the My-datasets and access pages auth-only (no dataset.view gate)', () => {
    const sdk = makeSdkSpy();
    datasetPlugin.install!(sdk as never);
    const routes: AddedRoute[] = sdk.addRoute.mock.calls.map((call) => call[0] as AddedRoute);

    const myDatasets = routes.find((route) => route.path === '/dashboard/datasets');
    const accessDetail = routes.find((route) => route.path === '/dashboard/datasets/:slug');
    expect(myDatasets?.meta?.requiresAuth).toBe(true);
    expect(myDatasets?.meta?.requiredUserPermission).toBeUndefined();
    expect(accessDetail?.meta?.requiresAuth).toBe(true);
    expect(accessDetail?.meta?.requiredUserPermission).toBeUndefined();
  });

  it('surfaces the dashboard widget via addComponent(DashboardDatasets)', () => {
    const sdk = makeSdkSpy();
    datasetPlugin.install!(sdk as never);
    const componentNames = sdk.addComponent.mock.calls.map((call) => call[0]);
    expect(componentNames).toContain('DashboardDatasets');
  });

  it('registers TWO nav sub-items (My datasets + Data store) under the store group', () => {
    datasetPlugin.activate!();

    const storeItems = userNavRegistry.getGroupItems('store').filter(
      (item) => item.pluginName === 'dataset',
    );
    expect(storeItems).toHaveLength(2);

    const myDatasets = storeItems.find((item) => item.to === '/dashboard/datasets');
    const dataStore = storeItems.find((item) => item.to === '/data-store');
    expect(myDatasets).toBeDefined();
    expect(myDatasets?.labelKey).toBe('dataset.nav.myDatasets');
    // BUG 5 — the "My datasets" nav item is not gated on the admin dataset.view
    // permission (buyers are entitlement-gated, not RBAC-gated).
    expect(myDatasets?.requiredUserPermission).toBeUndefined();
    expect(dataStore).toBeDefined();
    expect(dataStore?.labelKey).toBe('dataset.nav.dataStore');
  });

  it('deactivate removes both nav sub-items', () => {
    datasetPlugin.activate!();
    datasetPlugin.deactivate!();
    const storeItems = userNavRegistry.getGroupItems('store').filter(
      (item) => item.pluginName === 'dataset',
    );
    expect(storeItems).toHaveLength(0);
  });
});
