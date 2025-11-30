import { Request, Response } from 'express';
import { StockMovementModel } from '../models/StockMovement';
import { registerMovement, transferStock } from '../services/stockService';
import { AuthRequest } from '../middlewares/auth';

function upsertSummary(
  bucket: Map<string, Map<string, number>>,
  productId: string,
  location: string,
  quantity: number
) {
  const locMap = bucket.get(productId) || new Map<string, number>();
  locMap.set(location, quantity);
  bucket.set(productId, locMap);
}

export async function listMovements(req: Request, res: Response) {
  const { productId, type, from, to } = req.query;
  const page = Math.max(parseInt((req.query.page as string) || '1', 10), 1);
  const limit = Math.max(parseInt((req.query.limit as string) || '20', 10), 1);
  const skip = (page - 1) * limit;
  const location = typeof req.query.location === 'string' ? req.query.location : undefined;
  const filter: any = {};
  if (productId) filter.product = productId;
  if (type) filter.type = type;
  if (location) filter.location = location;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from as string);
    if (to) filter.createdAt.$lte = new Date(to as string);
  }
  const [movements, total] = await Promise.all([
    StockMovementModel.find(filter)
      .populate('product relatedPurchase relatedSale user')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StockMovementModel.countDocuments(filter)
  ]);

  res.json({ data: movements, total, page, pages: Math.ceil(total / limit) });
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

export async function transfer(req: AuthRequest, res: Response) {
  try {
    const { productId, from, to, quantity, reason } = req.body;
    const result = await transferStock({
      productId,
      from,
      to,
      quantity,
      reason,
      userId: req.user?.userId
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error?.message || 'Erro ao transferir estoque' });
  }
}

export async function summary(req: Request, res: Response) {
  const match: any = {};
  if (req.query.productId) match.product = req.query.productId;
  if (req.query.location) match.location = req.query.location;

  const movements = await StockMovementModel.find(match)
    .select('product type quantity location createdAt')
    .sort({ createdAt: 1 })
    .lean();

  const bucket = new Map<string, Map<string, number>>();

  for (const m of movements) {
    const productId = m.product?.toString?.() || '';
    const location = (m.location || 'default').toString();
    if (!productId) continue;

    const locMap = bucket.get(productId) || new Map<string, number>();
    const current = locMap.get(location) || 0;

    if (m.type === 'ENTRY') {
      locMap.set(location, current + Number(m.quantity || 0));
    } else if (m.type === 'EXIT') {
      locMap.set(location, current - Number(m.quantity || 0));
    } else if (m.type === 'ADJUSTMENT') {
      locMap.set(location, Number(m.quantity || 0));
    }

    bucket.set(productId, locMap);
  }

  const result: Array<{ product: string; location: string; quantity: number }> = [];
  for (const [productId, locMap] of bucket.entries()) {
    for (const [location, qty] of locMap.entries()) {
      result.push({ product: productId, location, quantity: qty });
    }
  }

  res.json(result);
}
