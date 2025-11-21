import { Request, Response } from 'express';
import { SupplierModel } from '../models/Supplier';

export async function createSupplier(req: Request, res: Response) {
  const supplier = await SupplierModel.create(req.body);
  res.status(201).json(supplier);
}

export async function listSuppliers(_req: Request, res: Response) {
  const suppliers = await SupplierModel.find();
  res.json(suppliers);
}

export async function getSupplier(req: Request, res: Response) {
  const supplier = await SupplierModel.findById(req.params.id);
  if (!supplier) return res.status(404).json({ message: 'Not found' });
  res.json(supplier);
}

export async function updateSupplier(req: Request, res: Response) {
  const supplier = await SupplierModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!supplier) return res.status(404).json({ message: 'Not found' });
  res.json(supplier);
}

export async function deleteSupplier(req: Request, res: Response) {
  const supplier = await SupplierModel.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!supplier) return res.status(404).json({ message: 'Not found' });
  res.json(supplier);
}
