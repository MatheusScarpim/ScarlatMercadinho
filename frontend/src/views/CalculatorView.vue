<template>
  <div class="calculator-page">
    <div class="calculator-card glass">
      <div class="calculator-header">
        <h2>Calculadora</h2>
        <span class="chip">Utilitário</span>
      </div>

      <div class="display">
        <div class="expression">{{ expression }}</div>
        <div class="result" :class="{ 'result-small': currentValue.length > 12 }">
          {{ displayValue }}
        </div>
      </div>

      <div class="buttons">
        <button class="btn btn-function" @click="clear">C</button>
        <button class="btn btn-function" @click="toggleSign">±</button>
        <button class="btn btn-function" @click="backspace">⌫</button>
        <button class="btn btn-operator" @click="setOperation('÷')">÷</button>

        <button class="btn btn-number" @click="appendDigit('7')">7</button>
        <button class="btn btn-number" @click="appendDigit('8')">8</button>
        <button class="btn btn-number" @click="appendDigit('9')">9</button>
        <button class="btn btn-operator" @click="setOperation('×')">×</button>

        <button class="btn btn-number" @click="appendDigit('4')">4</button>
        <button class="btn btn-number" @click="appendDigit('5')">5</button>
        <button class="btn btn-number" @click="appendDigit('6')">6</button>
        <button class="btn btn-operator" @click="setOperation('-')">−</button>

        <button class="btn btn-number" @click="appendDigit('1')">1</button>
        <button class="btn btn-number" @click="appendDigit('2')">2</button>
        <button class="btn btn-number" @click="appendDigit('3')">3</button>
        <button class="btn btn-operator" @click="setOperation('+')">+</button>

        <button class="btn btn-number btn-zero" @click="appendDigit('0')">0</button>
        <button class="btn btn-number" @click="appendDot">,</button>
        <button class="btn btn-equals" @click="calculate">=</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const currentValue = ref('0');
const previousValue = ref('');
const operation = ref('');
const shouldReset = ref(false);
const expression = ref('');

const displayValue = computed(() => {
  const val = currentValue.value;
  if (val === 'Erro') return 'Erro';
  const num = parseFloat(val);
  if (isNaN(num)) return '0';
  if (val.includes('.') || val.endsWith('.')) return val;
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 10 });
});

function appendDigit(digit: string) {
  if (shouldReset.value) {
    currentValue.value = digit;
    shouldReset.value = false;
  } else {
    if (currentValue.value === '0' && digit !== '0') {
      currentValue.value = digit;
    } else {
      currentValue.value += digit;
    }
  }
}

function appendDot() {
  if (shouldReset.value) {
    currentValue.value = '0.';
    shouldReset.value = false;
    return;
  }
  if (!currentValue.value.includes('.')) {
    currentValue.value += '.';
  }
}

function setOperation(op: string) {
  if (operation.value && !shouldReset.value) {
    calculate();
  }
  previousValue.value = currentValue.value;
  operation.value = op;
  shouldReset.value = true;
  expression.value = `${parseFloat(previousValue.value).toLocaleString('pt-BR', { maximumFractionDigits: 10 })} ${op}`;
}

function calculate() {
  if (!operation.value || !previousValue.value) return;

  const prev = parseFloat(previousValue.value);
  const curr = parseFloat(currentValue.value);
  let result = 0;

  switch (operation.value) {
    case '+': result = prev + curr; break;
    case '-': result = prev - curr; break;
    case '×': result = prev * curr; break;
    case '÷':
      if (curr === 0) {
        currentValue.value = 'Erro';
        operation.value = '';
        previousValue.value = '';
        expression.value = '';
        shouldReset.value = true;
        return;
      }
      result = prev / curr;
      break;
  }

  expression.value = `${parseFloat(previousValue.value).toLocaleString('pt-BR', { maximumFractionDigits: 10 })} ${operation.value} ${parseFloat(currentValue.value).toLocaleString('pt-BR', { maximumFractionDigits: 10 })} =`;
  currentValue.value = String(result);
  operation.value = '';
  previousValue.value = '';
  shouldReset.value = true;
}

function clear() {
  currentValue.value = '0';
  previousValue.value = '';
  operation.value = '';
  expression.value = '';
  shouldReset.value = false;
}

function toggleSign() {
  if (currentValue.value === '0') return;
  if (currentValue.value.startsWith('-')) {
    currentValue.value = currentValue.value.slice(1);
  } else {
    currentValue.value = '-' + currentValue.value;
  }
}

function backspace() {
  if (shouldReset.value) return;
  if (currentValue.value.length <= 1 || (currentValue.value.length === 2 && currentValue.value.startsWith('-'))) {
    currentValue.value = '0';
  } else {
    currentValue.value = currentValue.value.slice(0, -1);
  }
}
</script>

<style scoped>
.calculator-page {
  display: grid;
  place-items: center;
  min-height: 100%;
  padding: 20px;
}

.calculator-card {
  width: 100%;
  max-width: 380px;
  padding: 24px;
}

.glass {
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  border-radius: var(--radius);
}

.calculator-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 2px solid var(--border);
}

.calculator-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.chip {
  background: rgba(16, 180, 157, 0.12);
  padding: 4px 10px;
  border-radius: 999px;
  color: var(--primary);
  border: 1px solid rgba(16, 180, 157, 0.3);
  font-weight: 600;
  font-size: 12px;
}

.display {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9));
  border: 2px solid var(--border);
  border-radius: 14px;
  padding: 16px 20px;
  margin-bottom: 20px;
  min-height: 90px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-end;
  overflow: hidden;
}

.expression {
  font-size: 14px;
  color: var(--muted);
  min-height: 20px;
  word-break: break-all;
  text-align: right;
  width: 100%;
}

.result {
  font-size: 36px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
  word-break: break-all;
  text-align: right;
  width: 100%;
  transition: font-size 0.15s ease;
}

.result-small {
  font-size: 24px;
}

.buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.btn {
  border: none;
  padding: 16px 8px;
  border-radius: 12px;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  user-select: none;
  -webkit-user-select: none;
}

.btn:active {
  transform: scale(0.95);
}

.btn-number {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border: 2px solid var(--border);
  color: var(--text);
}

.btn-number:hover {
  background: linear-gradient(135deg, #e9ecef, #d0d5dd);
  border-color: rgba(16, 180, 157, 0.3);
}

.btn-operator {
  background: linear-gradient(135deg, rgba(16, 180, 157, 0.12), rgba(16, 180, 157, 0.08));
  border: 2px solid rgba(16, 180, 157, 0.25);
  color: var(--primary);
}

.btn-operator:hover {
  background: linear-gradient(135deg, rgba(16, 180, 157, 0.2), rgba(16, 180, 157, 0.14));
  border-color: var(--primary);
}

.btn-function {
  background: linear-gradient(135deg, #f1f3f5, #e9ecef);
  border: 2px solid var(--border);
  color: var(--muted);
}

.btn-function:hover {
  background: linear-gradient(135deg, #e9ecef, #d0d5dd);
  color: var(--text);
}

.btn-equals {
  background: linear-gradient(120deg, var(--primary), var(--primary-strong));
  color: #0c1829;
  border: none;
  box-shadow: 0 2px 8px rgba(91, 231, 196, 0.3);
}

.btn-equals:hover {
  box-shadow: 0 6px 20px rgba(91, 231, 196, 0.4);
  transform: translateY(-1px);
}

.btn-zero {
  grid-column: span 1;
}
</style>
