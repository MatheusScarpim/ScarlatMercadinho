import { Request, Response } from 'express';
import { UnitModel } from '../models/Unit';

export async function createUnit(req: Request, res: Response) {
  const unit = await UnitModel.create(req.body);
  res.status(201).json(unit);
}

export async function listUnits(_req: Request, res: Response) {
  const units = await UnitModel.find();
  res.json(units);
}

export async function getUnit(req: Request, res: Response) {
  const unit = await UnitModel.findById(req.params.id);
  if (!unit) return res.status(404).json({ message: 'Not found' });
  res.json(unit);
}

export async function updateUnit(req: Request, res: Response) {
  const unit = await UnitModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!unit) return res.status(404).json({ message: 'Not found' });
  res.json(unit);
}

export async function deleteUnit(req: Request, res: Response) {
  const unit = await UnitModel.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!unit) return res.status(404).json({ message: 'Not found' });
  res.json(unit);
}
