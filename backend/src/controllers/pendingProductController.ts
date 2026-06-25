import { Request, Response } from 'express';
import { PendingProductModel } from '../models/PendingProduct';
import { ProductModel } from '../models/Product';

export async function listPendingProducts(req: Request, res: Response) {
  const status = (req.query.status as string) || 'PENDING';
  const filter: any = {};
  if (status !== 'all') filter.status = status;

  const items = await PendingProductModel.find(filter)
    .populate('resolvedProduct')
    .sort({ lastSeenAt: -1 });
  res.json(items);
}

export async function resolvePendingProduct(req: Request, res: Response) {
  const pending = await PendingProductModel.findById(req.params.id);
  if (!pending) return res.status(404).json({ message: 'Pendência não encontrada' });
  if (pending.status === 'RESOLVED') {
    return res.status(400).json({ message: 'Pendência já resolvida' });
  }

  const category = (req.body.category?._id as string) || (req.body.category as string);
  if (!category || (typeof category === 'string' && !category.trim())) {
    return res.status(400).json({ message: 'Campo category é obrigatório.' });
  }

  const barcode = (req.body.barcode as string) || pending.barcode;
  const imageUrl = barcode
    ? `https://cdn-cosmos.bluesoft.com.br/products/${barcode}`
    : req.body.imageUrl || null;

  const product = await ProductModel.create({ ...req.body, barcode, category, imageUrl });

  pending.status = 'RESOLVED';
  pending.resolvedProduct = product._id as any;
  await pending.save();

  res.status(201).json({ pending, product });
}

export async function ignorePendingProduct(req: Request, res: Response) {
  const pending = await PendingProductModel.findByIdAndUpdate(
    req.params.id,
    { status: 'IGNORED' },
    { new: true }
  );
  if (!pending) return res.status(404).json({ message: 'Pendência não encontrada' });
  res.json(pending);
}
