<template>
  <div class="calculator-view">
    <h1>Calculator</h1>
    <CalculatorComponent />
  </div>
</template>

<script setup lang="ts">
import CalculatorComponent from '../components/CalculatorComponent.vue';
</script>

<style scoped>
.calculator-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg, #1a1a2e);
  color: var(--text, #fff);
  font-family: var(--font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
}
h1 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
}
</style>
