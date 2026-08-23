# vbwd-fe-user-plugin-dataset

fe-user plugin for the **Datasets** vertical (S110). Adds:

- A **Datasets** navigation block (two items under the Store group): **My datasets**
  (`/dashboard/datasets`) and **Data store** (`/data-store`).
- A **Data store** catalogue (copied from ghrm's pattern; no ghrm import) —
  `DatasetCatalogue` + `DatasetDetail` CMS Vue-component widgets — that lists
  datasets by category and routes to checkout via the dataset's plan link.
- **My datasets** — the user's entitled datasets, a `last`-snapshot download, and
  an API-key link. Also surfaced on the dashboard via `DashboardDatasets`.
- A **dataset access/detail page** (`/dashboard/datasets/:slug`) showing the scoped
  API URL + the user's API key, a browser download button, issue metadata, and a
  first-100-rows spreadsheet preview.

Backend endpoints consumed (see `src/api/datasetApi.ts`):
`GET /api/v1/dataset`, `/dataset/<slug>`, `/dataset/my`, `/dataset/categories`,
`/dataset/<slug>/preview`, `/dataset/<slug>/meta`, `/dataset/<slug>/data`,
`/dataset/<slug>/download`.

## Named export

The plugin is a **named export** (`export const datasetPlugin`), loaded by the
fe-user plugin registry from `plugins.json`.

## Tests

```bash
npx vitest run plugins/dataset
```

## Documentation

Full platform documentation lives at **[vbwd.cc/docs](https://vbwd.cc/docs)**.

- [Frontend plugins](https://vbwd.cc/docs-frontend-plugins) — how fe-admin / fe-user plugins are built and mounted
- [Data exchange](https://vbwd.cc/docs-data-exchange) — documentation for this plugin's domain
- [Architecture](https://vbwd.cc/docs-architecture) — platform layering and the core-agnosticism rule
- [Getting started](https://vbwd.cc/docs-getting-started) — install a VBWD instance and enable plugins
