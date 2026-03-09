import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError';
import { PaymentError } from '../errors/paymentErrors';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof PaymentError) {
    return res.status(err.status).json({
      message: err.userMessage,
      code: err.code,
      retryable: err.retryable,
      detail: err.message
    });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}
