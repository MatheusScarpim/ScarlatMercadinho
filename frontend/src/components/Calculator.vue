<template>
  <div class="calc">
    <div class="calc-display">
      <div class="calc-expression">{{ expression }}</div>
      <div class="calc-value" :class="{ 'calc-value--small': displayValue.length > 10 }">
        {{ displayValue }}
      </div>
    </div>
    <div class="calc-keys">
      <button class="calc-key calc-key--fn" @click="clear">C</button>
      <button class="calc-key calc-key--fn" @click="backspace">⌫</button>
      <button class="calc-key calc-key--fn" @click="appendPercent">%</button>
      <button class="calc-key calc-key--op" @click="chooseOperation('/')">÷</button>

      <button class="calc-key" @click="appendNumber('7')">7</button>
      <button class="calc-key" @click="appendNumber('8')">8</button>
      <button class="calc-key" @click="appendNumber('9')">9</button>
      <button class="calc-key calc-key--op" @click="chooseOperation('*')">×</button>

      <button class="calc-key" @click="appendNumber('4')">4</button>
      <button class="calc-key" @click="appendNumber('5')">5</button>
      <button class="calc-key" @click="appendNumber('6')">6</button>
      <button class="calc-key calc-key--op" @click="chooseOperation('-')">−</button>

      <button class="calc-key" @click="appendNumber('1')">1</button>
      <button class="calc-key" @click="appendNumber('2')">2</button>
      <button class="calc-key" @click="appendNumber('3')">3</button>
      <button class="calc-key calc-key--op" @click="chooseOperation('+')">+</button>

      <button class="calc-key calc-key--zero" @click="appendNumber('0')">0</button>
      <button class="calc-key" @click="appendDecimal">,</button>
      <button class="calc-key calc-key--eq" @click="compute">=</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const emit = defineEmits<{
  result: [value: number];
  change: [value: string];
}>();

const currentValue = ref('0');
const previousValue = ref<number | null>(null);
const operation = ref<string | null>(null);
const shouldReset = ref(false);

const displayValue = computed(() => {
  const str = currentValue.value;
  if (str === 'Infinity' || str === '-Infinity') return 'Erro';
  if (str === 'NaN') return 'Erro';
  return str;
});

const expression = computed(() => {
  if (previousValue.value === null || operation.value === null) return '';
  const opSymbol: Record<string, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  return `${formatNumber(previousValue.value)} ${opSymbol[operation.value] || operation.value}`;
});

function formatNumber(n: number): string {
  const str = String(n).replace('.', ',');
  if (str.length > 14) return n.toExponential(2).replace('.', ',');
  return str;
}

function appendNumber(num: string) {
  if (shouldReset.value) {
    currentValue.value = num;
    shouldReset.value = false;
  } else {
    if (currentValue.value === '0' && num !== '.') {
      currentValue.value = num;
    } else {
      if (currentValue.value.replace('-', '').replace(',', '').length >= 15) return;
      currentValue.value += num;
    }
  }
  emit('change', currentValue.value);
}

function appendDecimal() {
  if (shouldReset.value) {
    currentValue.value = '0,';
    shouldReset.value = false;
    emit('change', currentValue.value);
    return;
  }
  if (currentValue.value.includes(',')) return;
  currentValue.value += ',';
  emit('change', currentValue.value);
}

function appendPercent() {
  const num = parseFloat(currentValue.value.replace(',', '.'));
  if (isNaN(num)) return;
  const result = num / 100;
  currentValue.value = String(result).replace('.', ',');
  emit('change', currentValue.value);
}

function chooseOperation(op: string) {
  if (operation.value && !shouldReset.value) {
    compute();
  }
  const num = parseFloat(currentValue.value.replace(',', '.'));
  if (isNaN(num)) return;
  previousValue.value = num;
  operation.value = op;
  shouldReset.value = true;
}

function compute() {
  const curr = parseFloat(currentValue.value.replace(',', '.'));
  const prev = previousValue.value;
  const op = operation.value;
  if (prev === null || op === null || isNaN(curr)) return;
  let result: number;
  switch (op) {
    case '+': result = prev + curr; break;
    case '-': result = prev - curr; break;
    case '*': result = prev * curr; break;
    case '/':
      if (curr === 0) {
        currentValue.value = 'Erro';
        previousValue.value = null;
        operation.value = null;
        shouldReset.value = true;
        emit('change', 'Erro');
        return;
      }
      result = prev / curr;
      break;
    default: return;
  }
  const raw = Number.isInteger(result) ? String(result) : String(parseFloat(result.toFixed(10)));
  const formatted = raw.replace('.', ',');
  currentValue.value = formatted;
  previousValue.value = null;
  operation.value = null;
  shouldReset.value = true;
  emit('result', result);
  emit('change', formatted);
}

function clear() {
  currentValue.value = '0';
  previousValue.value = null;
  operation.value = null;
  shouldReset.value = false;
  emit('change', '0');
}

function backspace() {
  if (shouldReset.value) return;
  if (currentValue.value.length <= 1 || (currentValue.value.length === 2 && currentValue.value.startsWith('-'))) {
    currentValue.value = '0';
  } else {
    currentValue.value = currentValue.value.slice(0, -1);
  }
  emit('change', currentValue.value);
}
</script>

<style scoped>
.calc {
  width: 100%;
  max-width: 320px;
  background: var(--surface, #fff);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border, #e2e8f0);
}

.calc-display {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: #fff;
  padding: 20px 18px 16px;
  text-align: right;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
}

.calc-expression {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  min-height: 18px;
  font-weight: 500;
  letter-spacing: 0.02em;
  word-break: break-all;
}

.calc-value {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.1;
  word-break: break-all;
  transition: font-size 0.15s ease;
}

.calc-value--small {
  font-size: 26px;
}

.calc-keys {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border, #e2e8f0);
}

.calc-key {
  padding: 16px 8px;
  border: none;
  background: var(--surface, #fff);
  color: var(--text, #1f2937);
  font-size: 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.1s, transform 0.05s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  user-select: none;
}

.calc-key:active {
  background: #e2e8f0;
  transform: scale(0.97);
}

.calc-key--fn {
  background: #f1f5f9;
  color: #64748b;
  font-weight: 600;
  font-size: 16px;
}

.calc-key--fn:active {
  background: #cbd5e1;
}

.calc-key--op {
  background: #fef9c3;
  color: #92400e;
  font-weight: 700;
  font-size: 22px;
}

.calc-key--op:active {
  background: #fde68a;
}

.calc-key--zero {
  grid-column: span 2;
}

.calc-key--eq {
  background: var(--primary, #10b49d);
  color: #fff;
  font-weight: 700;
  font-size: 24px;
}

.calc-key--eq:active {
  background: #0d9488;
}
</style>
