import { Request, Response } from 'express';
import { StockMovementModel } from '../models/StockMovement';
import { registerMovement } from '../services/stockService';
import { AuthRequest } from '../middlewares/auth';

export async function listMovements(req: Request, res: Response) {
  const { productId, type, from, to } = req.query;
  const filter: any = {};
  if (productId) filter.product = productId;
  if (type) filter.type = type;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from as string);
    if (to) filter.createdAt.$lte = new Date(to as string);
  }
  const movements = await StockMovementModel.find(filter)
    .populate('product relatedPurchase relatedSale user')
    .sort({ createdAt: -1 });
  res.json(movements);
}

export async function createAdjustment(req: AuthRequest, res: Response) {
  const movement = await registerMovement({
    productId: req.body.productId,
    type: req.body.type,
    quantity: req.body.quantity,
    reason: req.body.reason || 'AJUSTE INVENTÁRIO',
    userId: req.user?.userId
  });
  res.status(201).json(movement);
}
