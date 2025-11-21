import { UserModel } from '../models/User';
import { comparePassword, hashPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { ApiError } from '../utils/apiError';

export async function login(email: string, password: string) {
  const user = await UserModel.findOne({ email, active: true });
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
    role: 'ADMIN'
  });
  console.log('Seeded default admin: admin@example.com / admin123');
}
