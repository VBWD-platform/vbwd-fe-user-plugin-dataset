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
