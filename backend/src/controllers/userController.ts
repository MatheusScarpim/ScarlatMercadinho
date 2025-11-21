import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { hashPassword } from '../utils/password';

export async function createUser(req: Request, res: Response) {
  const { name, email, password, role } = req.body;
  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({ name, email, passwordHash, role });
  res.status(201).json(user);
}

export async function listUsers(_req: Request, res: Response) {
  const users = await UserModel.find();
  res.json(users);
}

export async function getUser(req: Request, res: Response) {
  const { id } = req.params;
  const user = await UserModel.findById(id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const updates: any = { ...req.body };
  if (updates.password) {
    updates.passwordHash = await hashPassword(updates.password);
    delete updates.password;
  }
  const user = await UserModel.findByIdAndUpdate(id, updates, { new: true });
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  const user = await UserModel.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);
}
