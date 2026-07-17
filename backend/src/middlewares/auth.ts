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
export async function kioskOrAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  // Rotas usadas pelo Kiosk (PDV sem login) NUNCA devem ser bloqueadas.
  // Se houver um Bearer válido, anexa o contexto do usuário (best-effort).
  // Token ausente/expirado/inválido não impede a requisição: segue como acesso do quiosque.
  const header = req.headers.authorization;
  if (header) {
    try {
      const token = header.replace('Bearer ', '');
      const payload = verifyToken(token);
      const user = await UserModel.findById(payload.userId).select('role permissions active');
      if (user && user.active) {
        req.user = {
          userId: user.id,
          role: user.role,
          permissions: Array.isArray(user.permissions) ? user.permissions : ALL_PERMISSIONS
        };
      }
    } catch {
      // ignora token inválido/expirado — quiosque não deve ser bloqueado
    }
  }
  return next();
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
