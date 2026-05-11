<template>
  <div class="calculator">
    <div class="display glass">
      <div class="expression">{{ expression || '\u00A0' }}</div>
      <div class="result" :class="{ 'result--small': display.length > 12 }">{{ display }}</div>
    </div>
    <div class="buttons">
      <button class="btn btn--function" @click="clear">C</button>
      <button class="btn btn--function" @click="toggleSign">±</button>
      <button class="btn btn--function" @click="percent">%</button>
      <button class="btn btn--operator" @click="setOperator('/')">÷</button>

      <button class="btn btn--number" @click="appendDigit('7')">7</button>
      <button class="btn btn--number" @click="appendDigit('8')">8</button>
      <button class="btn btn--number" @click="appendDigit('9')">9</button>
      <button class="btn btn--operator" @click="setOperator('*')">×</button>

      <button class="btn btn--number" @click="appendDigit('4')">4</button>
      <button class="btn btn--number" @click="appendDigit('5')">5</button>
      <button class="btn btn--number" @click="appendDigit('6')">6</button>
      <button class="btn btn--operator" @click="setOperator('-')">−</button>

      <button class="btn btn--number" @click="appendDigit('1')">1</button>
      <button class="btn btn--number" @click="appendDigit('2')">2</button>
      <button class="btn btn--number" @click="appendDigit('3')">3</button>
      <button class="btn btn--operator" @click="setOperator('+')">+</button>

      <button class="btn btn--number btn--zero" @click="appendDigit('0')">0</button>
      <button class="btn btn--number" @click="appendDot">,</button>
      <button class="btn btn--equals" @click="calculate">=</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const current = ref('0');
const previous = ref('');
const operator = ref('');
const resetNext = ref(false);
const expression = ref('');

const display = computed(() => {
  const num = parseFloat(current.value);
  if (isNaN(num)) return '0';
  return current.value;
});

function appendDigit(digit: string) {
  if (resetNext.value) {
    current.value = digit;
    resetNext.value = false;
  } else {
    if (current.value === '0' && digit !== '.') {
      current.value = digit;
    } else {
      current.value += digit;
    }
  }
}

function appendDot() {
  if (resetNext.value) {
    current.value = '0.';
    resetNext.value = false;
    return;
  }
  if (!current.value.includes('.')) {
    current.value += '.';
  }
}

function clear() {
  current.value = '0';
  previous.value = '';
  operator.value = '';
  resetNext.value = false;
  expression.value = '';
}

function toggleSign() {
  if (current.value !== '0') {
    current.value = current.value.startsWith('-')
      ? current.value.slice(1)
      : '-' + current.value;
  }
}

function percent() {
  const num = parseFloat(current.value);
  if (!isNaN(num)) {
    current.value = String(num / 100);
  }
}

function setOperator(op: string) {
  if (operator.value && !resetNext.value) {
    calculate(true);
  }
  previous.value = current.value;
  operator.value = op;
  resetNext.value = true;
  expression.value = `${previous.value} ${formatOperator(op)}`;
}

function calculate(chain = false) {
  if (!operator.value || !previous.value) return;

  const a = parseFloat(previous.value);
  const b = parseFloat(current.value);
  if (isNaN(a) || isNaN(b)) return;

  let result = 0;
  switch (operator.value) {
    case '+': result = a + b; break;
    case '-': result = a - b; break;
    case '*': result = a * b; break;
    case '/':
      if (b === 0) {
        current.value = 'Erro';
        resetNext.value = true;
        operator.value = '';
        previous.value = '';
        expression.value = '';
        return;
      }
      result = a / b;
      break;
  }

  result = round(result);
  const resultStr = String(result);
  expression.value = chain ? `${expression.value} ${current.value} ${formatOperator(operator.value)}` : `${previous.value} ${formatOperator(operator.value)} ${current.value} =`;
  current.value = resultStr;
  previous.value = chain ? resultStr : '';
  resetNext.value = true;
  if (!chain) {
    operator.value = '';
  }
}

function formatOperator(op: string): string {
  const map: Record<string, string> = {
    '+': '+', '-': '−', '*': '×', '/': '÷'
  };
  return map[op] || op;
}

function round(n: number): number {
  return Math.round(n * 1e10) / 1e10;
}
</script>

<style scoped>
.calculator {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 320px;
  margin: 0 auto;
  padding: 8px 0;
}

.display {
  padding: 20px 20px 16px;
  border-radius: 12px;
  text-align: right;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
  overflow: hidden;
}

.expression {
  font-size: 13px;
  color: var(--muted);
  min-height: 18px;
  word-break: break-all;
  line-height: 1.3;
  direction: rtl;
  text-align: right;
}

.result {
  font-size: 32px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
  word-break: break-all;
  transition: font-size 0.15s ease;
}

.result--small {
  font-size: 24px;
}

.buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.btn {
  height: 56px;
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  color: var(--text);
  user-select: none;
  -webkit-user-select: none;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.btn:active {
  transform: translateY(0);
  box-shadow: none;
}

.btn--number {
  background: var(--surface);
}

.btn--number:hover {
  background: rgba(91, 231, 196, 0.06);
  border-color: rgba(91, 231, 196, 0.25);
}

.btn--function {
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 16px;
}

.btn--function:hover {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.25);
  color: #f59e0b;
}

.btn--operator {
  background: rgba(91, 231, 196, 0.08);
  border-color: rgba(91, 231, 196, 0.2);
  color: var(--primary-strong);
  font-size: 22px;
}

.btn--operator:hover {
  background: rgba(91, 231, 196, 0.15);
  border-color: rgba(91, 231, 196, 0.35);
}

.btn--equals {
  background: linear-gradient(135deg, var(--primary), var(--primary-strong));
  border-color: transparent;
  color: #fff;
  font-size: 24px;
  box-shadow: 0 2px 8px rgba(91, 231, 196, 0.25);
}

.btn--equals:hover {
  box-shadow: 0 4px 14px rgba(91, 231, 196, 0.4);
  transform: translateY(-1px);
}

.btn--zero {
  grid-column: span 2;
}

.glass {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  backdrop-filter: blur(14px);
  box-shadow: var(--shadow);
}
</style>
