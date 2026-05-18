import { defineStore } from 'pinia';

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

export const useCalculatorStore = defineStore('calculator', {
  state: () => ({
    currentValue: '0',
    previousValue: null as number | null,
    operator: null as string | null,
    waitingForOperand: false,
    justEvaluated: false,
    expression: ''
  }),
  getters: {
    displayValue: (state) => {
      if (state.currentValue === '' || state.currentValue === '-') return '0';
      return state.currentValue;
    }
  },
  actions: {
    digit(d: string) {
      if (this.justEvaluated) {
        this.currentValue = d;
        this.expression = '';
        this.previousValue = null;
        this.operator = null;
        this.justEvaluated = false;
        this.waitingForOperand = false;
        return;
      }
      if (this.waitingForOperand) {
        this.currentValue = d;
        this.waitingForOperand = false;
      } else {
        if (this.currentValue === '0' && d !== '.') {
          this.currentValue = d;
        } else {
          if (this.currentValue.replace('-', '').length >= 15) return;
          this.currentValue += d;
        }
      }
    },
    decimal() {
      if (this.justEvaluated) {
        this.currentValue = '0,';
        this.expression = '';
        this.previousValue = null;
        this.operator = null;
        this.justEvaluated = false;
        this.waitingForOperand = false;
        return;
      }
      if (this.waitingForOperand) {
        this.currentValue = '0,';
        this.waitingForOperand = false;
        return;
      }
      if (this.currentValue.includes(',')) return;
      this.currentValue += ',';
    },
    clear() {
      this.currentValue = '0';
      this.previousValue = null;
      this.operator = null;
      this.waitingForOperand = false;
      this.justEvaluated = false;
      this.expression = '';
    },
    backspace() {
      if (this.justEvaluated || this.waitingForOperand) return;
      if (this.currentValue.length <= 1 || (this.currentValue.length === 2 && this.currentValue.startsWith('-'))) {
        this.currentValue = '0';
      } else {
        this.currentValue = this.currentValue.slice(0, -1);
      }
    },
    toggleSign() {
      if (this.currentValue === '0') return;
      this.currentValue = this.currentValue.startsWith('-')
        ? this.currentValue.slice(1)
        : '-' + this.currentValue;
    },
    percent() {
      const num = parseFloat(this.currentValue.replace(',', '.'));
      if (isNaN(num)) return;
      const result = num / 100;
      this.currentValue = String(result).replace('.', ',');
    },
    setOp(op: string) {
      const current = parseDisplay(this.currentValue);
      if (isNaN(current)) return;

      if (this.operator && !this.waitingForOperand) {
        const result = compute(this.previousValue!, this.operator, current);
        if (!isFinite(result)) {
          this.currentValue = 'Erro';
          this.expression = '';
          this.operator = null;
          this.previousValue = null;
          this.waitingForOperand = false;
          this.justEvaluated = false;
          return;
        }
        const formatted = formatResult(result);
        this.currentValue = formatted;
        this.expression = `${formatted} ${op}`;
        this.previousValue = result;
        this.justEvaluated = false;
      } else {
        this.expression = `${this.currentValue} ${op}`;
        this.previousValue = current;
        this.justEvaluated = false;
      }

      this.operator = op;
      this.waitingForOperand = true;
    },
    equals() {
      const current = parseDisplay(this.currentValue);
      if (isNaN(current)) return;
      if (!this.operator) return;

      const result = compute(this.previousValue!, this.operator, current);
      if (!isFinite(result)) {
        this.expression = `${this.previousValue} ${this.operator} ${this.currentValue} =`;
        this.currentValue = 'Erro';
        this.operator = null;
        this.previousValue = null;
        this.waitingForOperand = false;
        this.justEvaluated = true;
        return;
      }

      this.expression = `${this.previousValue} ${this.operator} ${this.currentValue} =`;
      this.currentValue = formatResult(result);
      this.operator = null;
      this.previousValue = null;
      this.waitingForOperand = true;
      this.justEvaluated = true;
    }
  }
});
