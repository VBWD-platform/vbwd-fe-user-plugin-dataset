<template>
  <div
    class="dataset-checkout-summary"
    data-testid="dataset-checkout-summary"
  >
    <div
      v-for="item in lineItems"
      :key="item.id"
      class="plan-row"
      :data-testid="`dataset-line-item-${item.id}`"
    >
      <span>{{ item.name }}</span>
      <span>
        <PriceDisplay
          convert-to-display
          :net-amount="Number(item.price)"
          :gross-amount="Number(item.price)"
          :currency="item.currency || defaultCurrency"
          :account-type="authStore.user?.account_type"
        />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Order summary for a one-time dataset checkout, contributed by the dataset
 * plugin's CheckoutSource and rendered by the generic public checkout page. It
 * reads the agnostic checkout store's projected line items (which the dataset
 * source supplies) — no dataset-specific math, just display.
 */
import { computed } from 'vue';
import { useAuthStore } from 'vbwd-view-component';
import { useCheckoutStore } from '@/stores/checkout';
import { useAppConfigStore } from '@/stores/appConfig';
import PriceDisplay from '@/components/PriceDisplay.vue';

const checkoutStore = useCheckoutStore();
const authStore = useAuthStore();
const appConfig = useAppConfigStore();

const lineItems = computed(() => checkoutStore.lineItems);
const defaultCurrency = computed(() => appConfig.defaultCurrency);
</script>

<style scoped>
.dataset-checkout-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plan-row {
  display: flex;
  justify-content: space-between;
  font-size: 1.05rem;
  color: #2c3e50;
}
</style>
