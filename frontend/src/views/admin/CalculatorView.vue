<template>
  <div class="calculator-page">
    <div class="header">
      <h3>Calculadora</h3>
    </div>
    <div class="calculator-wrapper">
      <Calculadora v-model="result" />
      <div class="result-display glass">
        <label>Resultado</label>
        <span class="result-value">{{ result || '0' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Calculadora from '../../components/Calculadora.vue';

const result = ref('0');
</script>

<style scoped>
.calculator-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.calculator-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  max-width: 400px;
  margin: 0 auto;
}

.result-display {
  width: 100%;
  padding: 20px;
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: center;
}

.result-display label {
  font-size: 13px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.result-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary);
  font-family: 'Courier New', monospace;
}
</style>
