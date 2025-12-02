import { Request, Response } from 'express';
import { UserDocument, UserModel } from '../models/User';
import { hashPassword } from '../utils/password';
import { ALL_PERMISSIONS, normalizePermissions, SCREEN_PERMISSIONS } from '../config/permissions';
import { ApiError } from '../utils/apiError';
import { AuthRequest } from '../middlewares/auth';

function presentUser(user: UserDocument) {
  const permissions = Array.isArray(user.permissions) ? user.permissions : ALL_PERMISSIONS;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    passwordMustChange: user.passwordMustChange,
    permissions,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createUser(req: Request, res: Response) {
  const { name, email, password, role, permissions } = req.body;
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!name || !trimmedEmail || !password) {
    throw new ApiError(400, 'Nome, e-mail e senha são obrigatórios');
  }
  if (!emailRegex.test(trimmedEmail)) {
    throw new ApiError(400, 'E-mail inválido');
  }
  if (typeof password !== 'string' || password.length < 6) {
    throw new ApiError(400, 'Senha deve ter pelo menos 6 caracteres');
  }
  if (role && !['ADMIN', 'STAFF'].includes(role)) {
    throw new ApiError(400, 'Perfil inválido');
  }
  const passwordHash = await hashPassword(password);
  const resolvedPermissions = normalizePermissions(permissions, ALL_PERMISSIONS);
  const user = await UserModel.create({
    name,
    email: trimmedEmail,
    passwordHash,
    role,
    permissions: resolvedPermissions,
    passwordMustChange: true
  });
  res.status(201).json(presentUser(user));
}

export async function listUsers(_req: Request, res: Response) {
  const users = await UserModel.find().sort({ createdAt: -1 });
  res.json(users.map((u) => presentUser(u)));
}

export async function getUser(req: Request, res: Response) {
  const { id } = req.params;
  const user = await UserModel.findById(id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(presentUser(user));
}

export async function updateUser(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const updates: any = { ...req.body };
  if (updates.email) {
    const trimmedEmail = typeof updates.email === 'string' ? updates.email.trim().toLowerCase() : '';
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      throw new ApiError(400, 'E-mail inválido');
    }
    updates.email = trimmedEmail;
  }
  if (updates.password) {
    if (typeof updates.password !== 'string' || updates.password.length < 6) {
      throw new ApiError(400, 'Senha deve ter pelo menos 6 caracteres');
    }
    updates.passwordHash = await hashPassword(updates.password);
    delete updates.password;
  }

  if ('permissions' in updates) {
    updates.permissions = normalizePermissions(updates.permissions);
  }

  // Bloqueia auto-desativação ou desativar admin via update
  if (updates.active === false) {
    const target = await UserModel.findById(id);
    if (!target) return res.status(404).json({ message: 'Not found' });
    if (req.user?.userId === target.id) {
      throw new ApiError(400, 'Você não pode desativar a si mesmo');
    }
    if (target.role === 'ADMIN') {
      throw new ApiError(400, 'Administradores não podem ser desativados');
    }
  }

  const user = await UserModel.findByIdAndUpdate(id, updates, { new: true });
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(presentUser(user));
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const target = await UserModel.findById(id);
  if (!target) return res.status(404).json({ message: 'Not found' });

  // Impede desativar a si mesmo ou qualquer ADMIN
  if (req.user?.userId === target.id) {
    throw new ApiError(400, 'Você não pode desativar a si mesmo');
  }
  if (target.role === 'ADMIN') {
    throw new ApiError(400, 'Administradores não podem ser desativados');
  }

  const user = await UserModel.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(presentUser(user));
}

export async function listPermissionOptions(_req: Request, res: Response) {
  res.json(SCREEN_PERMISSIONS);
}
