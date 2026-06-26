import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/apiError';
import { UserModel } from '../models/User';
import { ALL_PERMISSIONS, ScreenPermission } from '../config/permissions';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: 'ADMIN' | 'STAFF';
    permissions: ScreenPermission[];
  };
}

export async function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return next(new ApiError(401, 'Missing authorization header'));
  }
  const token = header.replace('Bearer ', '');
  try {
    const payload = verifyToken(token);
    const user = await UserModel.findById(payload.userId).select('role permissions active');

    if (!user || !user.active) {
      return next(new ApiError(401, 'Unauthorized'));
    }

    const permissions = Array.isArray(user.permissions) ? user.permissions : ALL_PERMISSIONS;

    req.user = {
      userId: user.id,
      role: user.role,
      permissions
    };
    return next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    return next(new ApiError(401, 'Invalid token'));
  }
}

// Protege rotas usadas pelo Kiosk (PDV sem login) sem quebrá-lo.
// - Se KIOSK_TOKEN não estiver configurado: mantém o comportamento atual (aberto).
// - Se configurado: aceita o header x-kiosk-token correspondente OU um JWT válido de usuário.
export function kioskOrAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const kioskToken = process.env.KIOSK_TOKEN;
  if (kioskToken && req.headers['x-kiosk-token'] === kioskToken) {
    return next();
  }
  if (req.headers.authorization) {
    return authMiddleware(req, res, next);
  }
  if (!kioskToken) {
    return next();
  }
  return next(new ApiError(401, 'Unauthorized'));
}

export function adminOnly(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(new ApiError(401, 'Unauthorized'));
  if (req.user.role !== 'ADMIN') return next(new ApiError(403, 'Forbidden'));
  return next();
}

export function requirePermission(required: ScreenPermission | ScreenPermission[]) {
  const requiredList = Array.isArray(required) ? required : [required];

  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, 'Unauthorized'));
    if (req.user.role === 'ADMIN') return next();

    const hasPermission = requiredList.some((perm) => req.user?.permissions?.includes(perm));
    if (!hasPermission) {
      return next(new ApiError(403, 'Forbidden'));
    }
    return next();
  };
}
