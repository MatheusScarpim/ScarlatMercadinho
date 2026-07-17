<template>
  <div v-if="pages > 1" class="pager glass">
    <button class="btn btn-ghost" :disabled="page <= 1" @click="go(page - 1)">← Anterior</button>
    <div class="pager-numbers">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="pager-num"
        :class="{ active: item.page === page, ellipsis: item.ellipsis }"
        :disabled="item.ellipsis"
        @click="item.ellipsis || go(item.page)"
      >
        {{ item.ellipsis ? '…' : item.page }}
      </button>
    </div>
    <button class="btn btn-ghost" :disabled="page >= pages" @click="go(page + 1)">Próxima →</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  page: number;
  pages: number;
}>();

const emit = defineEmits<{
  (e: 'change', page: number): void;
}>();

function go(target: number) {
  const clamped = Math.min(Math.max(1, target), props.pages);
  if (clamped !== props.page) emit('change', clamped);
}

// Gera a lista de páginas visíveis com reticências: sempre 1 e última,
// mais uma janela ao redor da página atual.
const items = computed(() => {
  const total = props.pages;
  const current = props.page;
  const result: Array<{ key: string; page: number; ellipsis: boolean }> = [];
  const pageSet = new Set<number>();

  pageSet.add(1);
  pageSet.add(total);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) pageSet.add(p);
  }

  const sorted = [...pageSet].sort((a, b) => a - b);
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) {
      result.push({ key: `gap-${prev}-${p}`, page: -1, ellipsis: true });
    }
    result.push({ key: `p-${p}`, page: p, ellipsis: false });
    prev = p;
  }
  return result;
});
</script>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px;
  margin-top: 12px;
}
.pager-numbers {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.pager-num {
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
}
.pager-num:hover:not(:disabled):not(.active) {
  border-color: var(--primary);
  color: var(--primary);
}
.pager-num.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  cursor: default;
}
.pager-num.ellipsis {
  border: none;
  background: transparent;
  cursor: default;
  min-width: 20px;
}
</style>
