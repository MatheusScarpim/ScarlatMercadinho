import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { createPurchase } from '../services/purchaseService';
import { PurchaseModel } from '../models/Purchase';

export async function create(req: AuthRequest, res: Response) {
  const purchase = await createPurchase({
    ...req.body,
    createdBy: req.user!.userId,
    location: req.body.location || 'default'
  });
  res.status(201).json(purchase);
}

export async function list(req: AuthRequest, res: Response) {
  const { from, to, supplierId } = req.query;
  const filter: any = {};
  if (supplierId) filter.supplier = supplierId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from as string);
    if (to) filter.createdAt.$lte = new Date(to as string);
  }
  const purchases = await PurchaseModel.find(filter)
    .populate('supplier createdBy items.product')
    .sort({ createdAt: -1 });
  res.json(purchases);
}

export async function get(req: AuthRequest, res: Response) {
  const purchase = await PurchaseModel.findById(req.params.id).populate('supplier createdBy items.product');
  if (!purchase) return res.status(404).json({ message: 'Not found' });
  res.json(purchase);
}
