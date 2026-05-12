import { Request, Response } from 'express';
import { ApiError } from '../utils/apiError';
import * as calculatorService from '../services/calculatorService';
import { CalculationLogModel } from '../models/CalculationLog';

export async function calculate(req: Request, res: Response) {
  const { a, b, operation } = req.body;

  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new ApiError(400, 'Parameters "a" and "b" must be numbers');
  }

  if (!operation || !['sum', 'subtract', 'multiply', 'divide'].includes(operation)) {
    throw new ApiError(400, 'Operation must be one of: sum, subtract, multiply, divide');
  }

  let result: calculatorService.CalculateResult;
  try {
    result = calculatorService.calculate({ a, b, operation });
  } catch (err: any) {
    throw new ApiError(400, err.message);
  }

  // Salva no histórico
  await CalculationLogModel.create({
    a: result.a,
    b: result.b,
    operation: result.operation,
    result: result.result,
  });

  res.json(result);
}

export async function history(_req: Request, res: Response) {
  const logs = await CalculationLogModel.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.json({ data: logs });
}
