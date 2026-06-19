<template>
  <div class="calculator-view">
    <h1>Calculator</h1>
    <div class="calculator">
      <div class="display">
        <input type="text" :value="display" readonly aria-label="Calculator display" />
      </div>
      <div class="buttons">
        <button
          v-for="btn in buttons"
          :key="btn.label"
          :class="btn.class"
          @click="handleClick(btn.label)"
        >
          {{ btn.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { calculate } from '../utils/calculator';

function formatNumber(n: number): string {
  if (!isFinite(n)) return 'Error';
  const str = String(n);
  if (str.length > 20) return n.toExponential(6);
  return str;
}

const display = ref('0');
let currentInput = '';
let operator: string | null = null;
let previousValue: number | null = null;
let resetNext = false;

const buttons = [
  { label: 'C', class: 'btn-clear' },
  { label: '±', class: 'btn-operator' },
  { label: '%', class: 'btn-operator' },
  { label: '÷', class: 'btn-operator' },
  { label: '7', class: 'btn-number' },
  { label: '8', class: 'btn-number' },
  { label: '9', class: 'btn-number' },
  { label: '×', class: 'btn-operator' },
  { label: '4', class: 'btn-number' },
  { label: '5', class: 'btn-number' },
  { label: '6', class: 'btn-number' },
  { label: '-', class: 'btn-operator' },
  { label: '1', class: 'btn-number' },
  { label: '2', class: 'btn-number' },
  { label: '3', class: 'btn-number' },
  { label: '+', class: 'btn-operator' },
  { label: '0', class: 'btn-number btn-zero' },
  { label: '.', class: 'btn-number' },
  { label: '=', class: 'btn-equals' },
];

function handleClick(label: string) {
  if (label >= '0' && label <= '9') {
    if (resetNext) {
      currentInput = '';
      resetNext = false;
    }
    currentInput += label;
    display.value = currentInput;
  } else if (label === '.') {
    if (resetNext) {
      currentInput = '0';
      resetNext = false;
    }
    if (!currentInput.includes('.')) {
      currentInput = (currentInput || '0') + '.';
      display.value = currentInput;
    }
  } else if (label === 'C') {
    currentInput = '';
    operator = null;
    previousValue = null;
    resetNext = false;
    display.value = '0';
  } else if (label === '±') {
    if (currentInput) {
      currentInput = String(-parseFloat(currentInput));
      display.value = currentInput;
    }
  } else if (label === '%') {
    if (currentInput) {
      currentInput = String(parseFloat(currentInput) / 100);
      display.value = currentInput;
    }
  } else if (label === '=') {
    if (operator && previousValue !== null && currentInput) {
      const result = calculate(previousValue, parseFloat(currentInput), operator);
      display.value = formatNumber(result);
      previousValue = result;
      currentInput = String(result);
      operator = null;
      resetNext = true;
    }
  } else {
    if (operator && previousValue !== null && currentInput) {
      const result = calculate(previousValue, parseFloat(currentInput), operator);
      display.value = formatNumber(result);
      previousValue = result;
    } else if (currentInput) {
      previousValue = parseFloat(currentInput);
    }
    operator = label === '×' ? '*' : label === '÷' ? '/' : label;
    resetNext = true;
  }
}
</script>

<style scoped>
.calculator-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #1a1a2e;
  color: #fff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.calculator {
  background: #16213e;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 320px;
}
.display input {
  width: 100%;
  height: 64px;
  background: #0f3460;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 2rem;
  text-align: right;
  padding: 0 16px;
  box-sizing: border-box;
  margin-bottom: 16px;
  outline: none;
}
.buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
button {
  height: 56px;
  border: none;
  border-radius: 8px;
  font-size: 1.25rem;
  cursor: pointer;
  transition: opacity 0.2s;
}
button:hover {
  opacity: 0.85;
}
.btn-number {
  background: #1a1a2e;
  color: #fff;
}
.btn-operator {
  background: #e94560;
  color: #fff;
}
.btn-clear {
  background: #533483;
  color: #fff;
}
.btn-equals {
  background: #0f3460;
  color: #fff;
}
.btn-zero {
  grid-column: span 2;
}
</style>
