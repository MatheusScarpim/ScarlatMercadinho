import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { ALL_PERMISSIONS } from '../config/permissions';
import { validateEmail } from '../utils/validation';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'E-mail inválido' });
  }
  const result = await authService.login(email, password);
  const permissions = Array.isArray(result.user.permissions)
    ? result.user.permissions
    : ALL_PERMISSIONS;
  res.json({
    token: result.token,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      passwordMustChange: result.user.passwordMustChange,
      permissions
    }
  });
}

export async function bootstrapAdmin(req: Request, res: Response) {
  const { name, email, password, secret } = req.body;
  const { user, token } = await authService.bootstrapAdmin(name, email, password, secret);
  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordMustChange: user.passwordMustChange,
      permissions: user.permissions
    }
  });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body;
  const payload = await authService.changePassword(req.user!.userId, currentPassword, newPassword);
  res.json({
    token: payload.token,
    user: {
      id: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
      role: payload.user.role,
      passwordMustChange: payload.user.passwordMustChange,
      permissions: payload.user.permissions
    }
  });
}
