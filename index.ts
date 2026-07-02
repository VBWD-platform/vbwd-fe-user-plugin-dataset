import type { IPlugin, IPlatformSDK } from 'vbwd-view-component';
import { userNavRegistry } from '@/plugins/userNavRegistry';
import { invoiceLineLinkRegistry } from '@/registries/invoiceLineLinkRegistry';
import { checkoutSourceRegistry } from '@/registries/checkoutSourceRegistry';
import { registerCmsVueComponent } from '../cms/src/registry/vueComponentRegistry';
import { datasetInvoiceLink } from './src/registry/datasetInvoiceLink';
import { datasetCheckoutSource } from './src/checkoutSource';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ru from './locales/ru.json';
import th from './locales/th.json';
import zh from './locales/zh.json';

export const datasetPlugin: IPlugin = {
  name: 'dataset',
  version: '26.6.1',
  description:
    'Datasets — sell access to processed public-data products; scoped API + dashboard access (S110).',
  dependencies: ['cms', 'checkout'],
  _active: false,

  install(sdk: IPlatformSDK) {
    sdk.addTranslations('en', en);
    sdk.addTranslations('de', de);
    sdk.addTranslations('es', es);
    sdk.addTranslations('fr', fr);
    sdk.addTranslations('ja', ja);
    sdk.addTranslations('ru', ru);
    sdk.addTranslations('th', th);
    sdk.addTranslations('zh', zh);

    // Register the Data-store catalogue widgets into the CMS component registry
    // (copied from ghrm's pattern — a CMS Vue-component widget placed on the
    // seeded `data-store` CMS page).
    Promise.all([
      import('./src/views/DatasetCatalogue.vue'),
      import('./src/views/DatasetDetail.vue'),
    ]).then(([catalogue, detail]) => {
      registerCmsVueComponent('DatasetCatalogue', catalogue.default);
      registerCmsVueComponent('DatasetDetail', detail.default);
    });

    // Public Data-store catalogue routes — rendered via CmsPage with the
    // appropriate page slug (mirrors ghrm's /category routes).
    sdk.addRoute({
      path: '/data-store',
      name: 'dataset-store-index',
      component: () => import('../cms/src/views/CmsPage.vue'),
      props: { slug: 'data-store' },
      meta: { requiresAuth: false, cmsLayout: true },
    });
    sdk.addRoute({
      path: '/data-store/:category_slug',
      name: 'dataset-store-list',
      component: () => import('../cms/src/views/CmsPage.vue'),
      props: { slug: 'data-store' },
      meta: { requiresAuth: false, cmsLayout: true },
    });
    sdk.addRoute({
      path: '/data-store/:category_slug/:dataset_slug',
      name: 'dataset-store-detail',
      component: () => import('../cms/src/views/CmsPage.vue'),
      props: { slug: 'dataset-detail' },
      meta: { requiresAuth: false, cmsLayout: true },
    });

    // My datasets — entitled datasets + API-key UI + `last` download. Access is
    // AUTH-only + backend-entitlement-gated: a buyer holds a DatasetMembership,
    // not the `dataset.view` ADMIN permission, so gating the route on that
    // permission would bounce legitimate buyers. The backend `/dataset/my` +
    // access endpoints 403 the non-entitled.
    sdk.addRoute({
      path: '/dashboard/datasets',
      name: 'dataset-my-datasets',
      component: () => import('./src/components/MyDatasets.vue'),
      meta: { requiresAuth: true },
    });
    // Dataset access/detail page (auth-only, backend-entitlement-gated): API URL
    // + key, download, issue metadata, first-100-rows preview.
    sdk.addRoute({
      path: '/dashboard/datasets/:slug',
      name: 'dataset-access-detail',
      component: () => import('./src/components/DatasetAccessDetail.vue'),
      props: true,
      meta: { requiresAuth: true },
    });

    // Surface "My datasets" on the user dashboard.
    sdk.addComponent('DashboardDatasets', () => import('./src/components/MyDatasets.vue'));

    // Make a purchased-dataset invoice line clickable via the generic host seam
    // (falls through the core itemLink() switch to /dashboard/datasets/<slug>).
    invoiceLineLinkRegistry.register(datasetInvoiceLink);

    // One-time purchase path: the generic /checkout page drives this source for
    // `?source=dataset`, producing a CUSTOM dataset invoice line (not a
    // recurring SUBSCRIPTION line), so the buyer's invoice line reaches the
    // dataset access page.
    checkoutSourceRegistry.register(datasetCheckoutSource);
  },

  activate() {
    this._active = true;
    // Two sub-items under the existing "Store" group. UserLayout only renders
    // the hardcoded `store` group (no arbitrary-group rendering), so a distinct
    // "Datasets" block would need a core UserLayout change — this uses the
    // zero-host-change fallback (group: 'store').
    userNavRegistry.register({
      pluginName: 'dataset',
      to: '/dashboard/datasets',
      icon: 'layers',
      labelKey: 'dataset.nav.myDatasets',
      testId: 'nav-dataset-my',
      group: 'store',
    });
    userNavRegistry.register({
      pluginName: 'dataset',
      to: '/data-store',
      icon: 'grid',
      labelKey: 'dataset.nav.dataStore',
      testId: 'nav-dataset-store',
      group: 'store',
      externalIcon: true,
    });
  },

  deactivate() {
    this._active = false;
    userNavRegistry.unregister('dataset');
  },
};
