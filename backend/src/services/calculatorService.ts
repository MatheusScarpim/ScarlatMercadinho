export type Operation = 'sum' | 'subtract' | 'multiply' | 'divide';

export interface CalculateParams {
  a: number;
  b: number;
  operation: Operation;
}

export interface CalculateResult {
  a: number;
  b: number;
  operation: Operation;
  result: number;
}

const OPERATION_MAP: Record<Operation, (a: number, b: number) => number> = {
  sum: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => {
    if (b === 0) throw new Error('Division by zero is not allowed');
    return a / b;
  },
};

export function calculate(params: CalculateParams): CalculateResult {
  const fn = OPERATION_MAP[params.operation];
  if (!fn) {
    throw new Error(`Unknown operation: ${params.operation}`);
  }
  const result = fn(params.a, params.b);
  return { ...params, result };
}
