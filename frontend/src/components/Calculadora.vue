<template>
  <div class="calc">
    <div class="calc-display">
      <div class="calc-expression">{{ expression }}</div>
      <div class="calc-value">{{ displayValue }}</div>
    </div>
    <div class="calc-buttons">
      <button class="calc-btn calc-btn--fn" @click="clear">C</button>
      <button class="calc-btn calc-btn--fn" @click="toggleSign">±</button>
      <button class="calc-btn calc-btn--fn" @click="percent">%</button>
      <button class="calc-btn calc-btn--op" @click="setOp('÷')">÷</button>

      <button class="calc-btn" @click="digit('7')">7</button>
      <button class="calc-btn" @click="digit('8')">8</button>
      <button class="calc-btn" @click="digit('9')">9</button>
      <button class="calc-btn calc-btn--op" @click="setOp('×')">×</button>

      <button class="calc-btn" @click="digit('4')">4</button>
      <button class="calc-btn" @click="digit('5')">5</button>
      <button class="calc-btn" @click="digit('6')">6</button>
      <button class="calc-btn calc-btn--op" @click="setOp('-')">-</button>

      <button class="calc-btn" @click="digit('1')">1</button>
      <button class="calc-btn" @click="digit('2')">2</button>
      <button class="calc-btn" @click="digit('3')">3</button>
      <button class="calc-btn calc-btn--op" @click="setOp('+')">+</button>

      <button class="calc-btn calc-btn--back" @click="backspace">⌫</button>
      <button class="calc-btn" @click="digit('0')">0</button>
      <button class="calc-btn" @click="decimal">,</button>
      <button class="calc-btn calc-btn--eq" @click="equals">=</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = withDefaults(defineProps<{
  modelValue?: string;
}>(), {
  modelValue: '0'
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const currentValue = ref(props.modelValue);
const previousValue = ref<number | null>(null);
const operator = ref<string | null>(null);
const waitingForOperand = ref(false);
const justEvaluated = ref(false);
const expression = ref('');

const displayValue = computed(() => {
  const val = currentValue.value;
  if (val === '' || val === '-') return '0';
  return val;
});

function updateDisplay() {
  emit('update:modelValue', currentValue.value);
}

function digit(d: string) {
  if (justEvaluated.value) {
    currentValue.value = d;
    expression.value = '';
    previousValue.value = null;
    operator.value = null;
    justEvaluated.value = false;
    waitingForOperand.value = false;
    updateDisplay();
    return;
  }
  if (waitingForOperand.value) {
    currentValue.value = d;
    waitingForOperand.value = false;
  } else {
    if (currentValue.value === '0' && d !== '.') {
      currentValue.value = d;
    } else {
      if (currentValue.value.replace('-', '').length >= 15) return;
      currentValue.value += d;
    }
  }
  updateDisplay();
}

function decimal() {
  if (justEvaluated.value) {
    currentValue.value = '0,';
    expression.value = '';
    previousValue.value = null;
    operator.value = null;
    justEvaluated.value = false;
    waitingForOperand.value = false;
    updateDisplay();
    return;
  }
  if (waitingForOperand.value) {
    currentValue.value = '0,';
    waitingForOperand.value = false;
    return;
  }
  if (currentValue.value.includes(',')) return;
  currentValue.value += ',';
  updateDisplay();
}

function clear() {
  currentValue.value = '0';
  previousValue.value = null;
  operator.value = null;
  waitingForOperand.value = false;
  justEvaluated.value = false;
  expression.value = '';
  updateDisplay();
}

function backspace() {
  if (justEvaluated.value || waitingForOperand.value) return;
  if (currentValue.value.length <= 1 || (currentValue.value.length === 2 && currentValue.value.startsWith('-'))) {
    currentValue.value = '0';
  } else {
    currentValue.value = currentValue.value.slice(0, -1);
  }
  updateDisplay();
}

function toggleSign() {
  if (currentValue.value === '0') return;
  currentValue.value = currentValue.value.startsWith('-')
    ? currentValue.value.slice(1)
    : '-' + currentValue.value;
  updateDisplay();
}

function percent() {
  const num = parseFloat(currentValue.value.replace(',', '.'));
  if (isNaN(num)) return;
  const result = num / 100;
  currentValue.value = String(result).replace('.', ',');
  updateDisplay();
}

function parseDisplay(val: string): number {
  return parseFloat(val.replace(',', '.'));
}

function formatResult(n: number): string {
  if (!isFinite(n)) return 'Erro';
  const str = String(n).replace('.', ',');
  if (str.length > 20) return n.toExponential(6).replace('.', ',');
  return str;
}

function compute(a: number, op: string, b: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b !== 0 ? a / b : NaN;
    default: return b;
  }
}

function setOp(op: string) {
  const current = parseDisplay(currentValue.value);
  if (isNaN(current)) return;

  if (operator.value && !waitingForOperand.value) {
    const result = compute(previousValue.value!, operator.value, current);
    if (!isFinite(result)) {
      currentValue.value = 'Erro';
      expression.value = '';
      operator.value = null;
      previousValue.value = null;
      waitingForOperand.value = false;
      updateDisplay();
      return;
    }
    const formatted = formatResult(result);
    currentValue.value = formatted;
    expression.value = `${formatted} ${op}`;
    previousValue.value = result;
  } else {
    expression.value = `${currentValue.value} ${op}`;
    previousValue.value = current;
  }

  operator.value = op;
  waitingForOperand.value = true;
  justEvaluated.value = false;
  updateDisplay();
}

function equals() {
  const current = parseDisplay(currentValue.value);
  if (isNaN(current)) return;
  if (!operator.value) return;

  const result = compute(previousValue.value!, operator.value, current);
  if (!isFinite(result)) {
    expression.value = `${previousValue.value} ${operator.value} ${currentValue.value} =`;
    currentValue.value = 'Erro';
    operator.value = null;
    previousValue.value = null;
    waitingForOperand.value = false;
    justEvaluated.value = true;
    updateDisplay();
    return;
  }

  expression.value = `${previousValue.value} ${operator.value} ${currentValue.value} =`;
  const formatted = formatResult(result);
  currentValue.value = formatted;
  operator.value = null;
  previousValue.value = null;
  waitingForOperand.value = true;
  justEvaluated.value = true;
  updateDisplay();
}
</script>

<style scoped>
.calc {
  width: 100%;
  max-width: 320px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow);
  user-select: none;
}

.calc-display {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  min-height: 72px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 4px;
  overflow: hidden;
}

.calc-expression {
  font-size: 13px;
  color: var(--muted);
  min-height: 18px;
  word-break: break-all;
  text-align: right;
  max-width: 100%;
}

.calc-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  word-break: break-all;
  text-align: right;
  max-width: 100%;
  line-height: 1.2;
}

.calc-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.calc-btn {
  border: none;
  background: var(--bg);
  color: var(--text);
  font-size: 20px;
  font-weight: 600;
  padding: 14px 0;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.12s, transform 0.08s;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calc-btn:active {
  transform: scale(0.94);
}

.calc-btn:hover {
  background: #e2e8f0;
}

.calc-btn--fn {
  background: #e2e8f0;
  color: var(--muted);
  font-size: 16px;
}

.calc-btn--fn:hover {
  background: #cbd5e1;
}

.calc-btn--op {
  background: rgba(16, 180, 157, 0.12);
  color: var(--primary);
  font-size: 22px;
  font-weight: 700;
}

.calc-btn--op:hover {
  background: rgba(16, 180, 157, 0.2);
}

.calc-btn--eq {
  background: linear-gradient(120deg, var(--primary), var(--primary-strong));
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}

.calc-btn--eq:active {
  background: linear-gradient(120deg, var(--primary-strong), #0b8a77);
}

.calc-btn--eq:hover {
  box-shadow: 0 2px 8px rgba(16, 180, 157, 0.3);
}

.calc-btn--back {
  font-size: 18px;
}
</style>
