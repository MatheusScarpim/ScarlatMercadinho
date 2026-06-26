import { Request, Response } from 'express';
import { CategoryModel } from '../models/Category';

export async function createCategory(req: Request, res: Response) {
  const payload = { ...req.body };
  if (payload.parent === '' || payload.parent === undefined) payload.parent = null;
  const category = await CategoryModel.create(payload);
  res.status(201).json(category);
}

export async function listCategories(_req: Request, res: Response) {
  const categories = await CategoryModel.find().populate('parent', 'name');
  res.json(categories);
}

export async function getCategory(req: Request, res: Response) {
  const category = await CategoryModel.findById(req.params.id).populate('parent', 'name');
  if (!category) return res.status(404).json({ message: 'Not found' });
  res.json(category);
}

export async function updateCategory(req: Request, res: Response) {
  const payload = { ...req.body };
  if (payload.parent === '') payload.parent = null;
  const category = await CategoryModel.findByIdAndUpdate(req.params.id, payload, { new: true });
  if (!category) return res.status(404).json({ message: 'Not found' });
  res.json(category);
}

export async function deleteCategory(req: Request, res: Response) {
  const category = await CategoryModel.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!category) return res.status(404).json({ message: 'Not found' });
  res.json(category);
}
