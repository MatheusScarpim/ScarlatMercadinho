import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/apiError';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: 'ADMIN' | 'STAFF';
  };
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return next(new ApiError(401, 'Missing authorization header'));
  }
  const token = header.replace('Bearer ', '');
  try {
    const payload = verifyToken(token);
    req.user = payload;
    return next();
  } catch {
    return next(new ApiError(401, 'Invalid token'));
  }
}

export function adminOnly(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(new ApiError(401, 'Unauthorized'));
  if (req.user.role !== 'ADMIN') return next(new ApiError(403, 'Forbidden'));
  return next();
}
