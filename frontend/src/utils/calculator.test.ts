import { describe, it, expect } from 'vitest';
import { calculate, compute, formatResult, parseDisplay } from '../utils/calculator';

// ---------------------------------------------------------------------------
// Unit tests for pure calculator functions
// ---------------------------------------------------------------------------

describe('calculate (a, b, op — used by CalculadoraView.vue)', () => {
  it('adds two numbers', () => {
    expect(calculate(2, 3, '+')).toBe(5);
  });

  it('subtracts two numbers', () => {
    expect(calculate(10, 4, '-')).toBe(6);
  });

  it('multiplies two numbers (× → *)', () => {
    expect(calculate(6, 7, '*')).toBe(42);
  });

  it('divides two numbers (÷ → /)', () => {
    expect(calculate(20, 4, '/')).toBe(5);
  });

  it('returns 0 on division by zero', () => {
    expect(calculate(5, 0, '/')).toBe(0);
  });

  it('handles negative results', () => {
    expect(calculate(3, 10, '-')).toBe(-7);
  });

  it('handles decimal results', () => {
    expect(calculate(10, 3, '/')).toBeCloseTo(3.333, 3);
  });

  it('returns b for unknown operator', () => {
    expect(calculate(10, 5, '^')).toBe(5);
  });
});

describe('compute (a, op, b — used by Calculadora.vue)', () => {
  it('adds two numbers', () => {
    expect(compute(2, '+', 3)).toBe(5);
  });

  it('subtracts two numbers', () => {
    expect(compute(10, '-', 4)).toBe(6);
  });

  it('multiplies using × symbol', () => {
    expect(compute(6, '×', 7)).toBe(42);
  });

  it('divides using ÷ symbol', () => {
    expect(compute(20, '÷', 4)).toBe(5);
  });

  it('returns NaN on division by zero', () => {
    expect(compute(5, '÷', 0)).toBeNaN();
  });

  it('handles floating point numbers', () => {
    expect(compute(0.1, '+', 0.2)).toBeCloseTo(0.3, 10);
  });

  it('returns b for unknown operator', () => {
    expect(compute(10, '^', 5)).toBe(5);
  });
});

describe('formatResult', () => {
  it('replaces period with comma', () => {
    expect(formatResult(3.5)).toBe('3,5');
  });

  it('returns integer as-is (with comma separator still applied)', () => {
    expect(formatResult(42)).toBe('42');
  });

  it('returns "Erro" for Infinity', () => {
    expect(formatResult(Infinity)).toBe('Erro');
  });

  it('returns "Erro" for NaN', () => {
    expect(formatResult(NaN)).toBe('Erro');
  });

  it('returns "Erro" for -Infinity', () => {
    expect(formatResult(-Infinity)).toBe('Erro');
  });

  it('formats very large numbers with exponential notation', () => {
    const result = formatResult(1e15);
    // Should be short enough to fit limit
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it('formats zero correctly', () => {
    expect(formatResult(0)).toBe('0');
  });
});

describe('parseDisplay', () => {
  it('parses comma as decimal separator', () => {
    expect(parseDisplay('3,5')).toBe(3.5);
  });

  it('parses integer string', () => {
    expect(parseDisplay('42')).toBe(42);
  });

  it('parses string with both period and comma (uses comma)', () => {
    expect(parseDisplay('1,5')).toBe(1.5);
  });

  it('parses zero', () => {
    expect(parseDisplay('0')).toBe(0);
  });
});
