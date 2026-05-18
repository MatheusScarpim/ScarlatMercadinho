<template>
  <div class="calc">
    <div class="calc-display">
      <div class="calc-expression">{{ calc.expression }}</div>
      <div class="calc-value">{{ calc.displayValue }}</div>
    </div>
    <div class="calc-buttons">
      <button class="calc-btn calc-btn--fn" @click="calc.clear()">C</button>
      <button class="calc-btn calc-btn--fn" @click="calc.toggleSign()">±</button>
      <button class="calc-btn calc-btn--fn" @click="calc.percent()">%</button>
      <button class="calc-btn calc-btn--op" @click="calc.setOp('÷')">÷</button>

      <button class="calc-btn" @click="calc.digit('7')">7</button>
      <button class="calc-btn" @click="calc.digit('8')">8</button>
      <button class="calc-btn" @click="calc.digit('9')">9</button>
      <button class="calc-btn calc-btn--op" @click="calc.setOp('×')">×</button>

      <button class="calc-btn" @click="calc.digit('4')">4</button>
      <button class="calc-btn" @click="calc.digit('5')">5</button>
      <button class="calc-btn" @click="calc.digit('6')">6</button>
      <button class="calc-btn calc-btn--op" @click="calc.setOp('-')">-</button>

      <button class="calc-btn" @click="calc.digit('1')">1</button>
      <button class="calc-btn" @click="calc.digit('2')">2</button>
      <button class="calc-btn" @click="calc.digit('3')">3</button>
      <button class="calc-btn calc-btn--op" @click="calc.setOp('+')">+</button>

      <button class="calc-btn calc-btn--back" @click="calc.backspace()">⌫</button>
      <button class="calc-btn" @click="calc.digit('0')">0</button>
      <button class="calc-btn" @click="calc.decimal()">,</button>
      <button class="calc-btn calc-btn--eq" @click="calc.equals()">=</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCalculatorStore } from '../stores/calculator';

const calc = useCalculatorStore();
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
