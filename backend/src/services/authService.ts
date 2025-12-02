import { UserModel } from '../models/User';
import { comparePassword, hashPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { ApiError } from '../utils/apiError';
import { ALL_PERMISSIONS } from '../config/permissions';
import { env } from '../config/env';
import { validateEmail } from '../utils/validation';

export async function login(email: string, password: string) {
  const user = await UserModel.findOne({ email: email.trim().toLowerCase(), active: true });
  if (!user) throw new ApiError(401, 'Invalid credentials');
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid credentials');
  const token = signToken({ userId: user.id, role: user.role });
  return { token, user };
}

export async function createAdminSeed() {
  const existing = await UserModel.findOne({ role: 'ADMIN' });
  if (existing) return;
  const passwordHash = await hashPassword('admin123');
  await UserModel.create({
    name: 'Admin',
    email: 'admin@example.com',
    passwordHash,
    role: 'ADMIN',
    permissions: ALL_PERMISSIONS
  });
  console.log('Seeded default admin: admin@example.com / admin123');
}

export async function bootstrapAdmin(name: string, email: string, password: string, secret?: string) {
  const existing = await UserModel.findOne({ role: 'ADMIN' });
  if (existing) {
    throw new ApiError(400, 'Já existe um administrador cadastrado');
  }

  if (!name || !email || !password) {
    throw new ApiError(400, 'Nome, e-mail e senha são obrigatórios');
  }
  const trimmedEmail = email.trim().toLowerCase();
  if (!validateEmail(trimmedEmail)) {
    throw new ApiError(400, 'E-mail inválido');
  }

  if (env.adminBootstrapSecret && env.adminBootstrapSecret !== secret) {
    throw new ApiError(403, 'Segredo inválido para criar admin');
  }

  if (!password || password.length < 6) {
    throw new ApiError(400, 'Informe uma senha com pelo menos 6 caracteres');
  }

  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({
    name,
    email: trimmedEmail,
    passwordHash,
    role: 'ADMIN',
    permissions: ALL_PERMISSIONS
  });

  const token = signToken({ userId: user.id, role: user.role });
  return { user, token };
}
