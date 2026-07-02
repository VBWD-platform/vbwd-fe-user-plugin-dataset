<template>
  <div
    class="dataset-preview-grid"
    data-testid="dataset-preview-grid"
  >
    <div
      v-if="!columns.length"
      class="dataset-preview-empty"
    >
      {{ $t('dataset.access.previewEmpty') }}
    </div>
    <div
      v-else
      class="dataset-preview-scroll"
    >
      <table class="dataset-preview-table">
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column"
            >
              {{ column }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in cappedRows"
            :key="rowIndex"
            data-testid="dataset-preview-row"
          >
            <td
              v-for="(cell, cellIndex) in row"
              :key="cellIndex"
            >
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * A simple spreadsheet-style grid for the first-100-rows dataset preview.
 * The server already caps the payload at 100 rows; this component enforces the
 * cap defensively so it can never render more than MAX_PREVIEW_ROWS.
 */
const MAX_PREVIEW_ROWS = 100;

const props = defineProps<{
  columns: string[];
  rows: Array<Array<string | number | null>>;
}>();

const cappedRows = computed(() => props.rows.slice(0, MAX_PREVIEW_ROWS));
</script>

<style scoped>
.dataset-preview-grid { width: 100%; }
.dataset-preview-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.dataset-preview-table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
.dataset-preview-table th,
.dataset-preview-table td {
  border: 1px solid #e9ecef;
  padding: 6px 10px;
  text-align: left;
  white-space: nowrap;
}
.dataset-preview-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
  position: sticky;
  top: 0;
}
.dataset-preview-table tbody tr:nth-child(even) { background: #fafbfc; }
.dataset-preview-empty { padding: 24px; text-align: center; color: #9ca3af; }
</style>
