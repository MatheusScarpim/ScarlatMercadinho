/**
 * Pure calculator functions extracted from CalculadoraView.vue and Calculadora.vue.
 * These are test-friendly, with no Vue or DOM dependencies.
 */

/**
 * Parses a display string (with comma as decimal separator) to a number.
 */
export function parseDisplay(val: string): number {
  return parseFloat(val.replace(',', '.'));
}

/**
 * Formats a numeric result for display (period → comma, error on NaN/Infinity).
 */
export function formatResult(n: number): string {
  if (!isFinite(n)) return 'Erro';
  const str = String(n).replace('.', ',');
  if (str.length > 20) return n.toExponential(6).replace('.', ',');
  return str;
}

/**
 * Core binary operation (used by CalculadoraView.vue: ×→*, ÷→/).
 */
export function calculate(a: number, b: number, op: string): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 0;
    default: return b;
  }
}

/**
 * Core binary operation (used by Calculadora.vue: keeps ×/÷ symbols).
 */
export function compute(a: number, op: string, b: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b !== 0 ? a / b : NaN;
    default: return b;
  }
}
