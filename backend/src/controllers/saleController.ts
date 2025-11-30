import { Request, Response } from 'express';
import * as saleService from '../services/saleService';
import { SaleItemModel } from '../models/SaleItem';
import { SaleModel } from '../models/Sale';

export async function createSale(req: Request, res: Response) {
  const sale = await saleService.createSale(req.body.origin, req.body.location || 'default');
  res.status(201).json(sale);
}

export async function addItem(req: Request, res: Response) {
  const result = await saleService.addItem(req.params.id, req.body);
  res.json(result);
}

export async function updateItem(req: Request, res: Response) {
  const result = await saleService.updateItem(req.params.id, req.params.itemId, req.body);
  res.json(result);
}

export async function removeItem(req: Request, res: Response) {
  const totals = await saleService.removeItem(req.params.id, req.params.itemId);
  res.json(totals);
}

export async function completeSale(req: Request, res: Response) {
  const sale = await saleService.completeSale(req.params.id, req.body);
  res.json(sale);
}

export async function cancelSale(req: Request, res: Response) {
  const sale = await saleService.cancelSale(req.params.id);
  res.json(sale);
}

export async function setCustomer(req: Request, res: Response) {
  const sale = await saleService.setCustomer(req.params.id, req.body);
  res.json(sale);
}

export async function getSale(req: Request, res: Response) {
  const sale = await SaleModel.findById(req.params.id);
  if (!sale) return res.status(404).json({ message: 'Not found' });
  const items = await SaleItemModel.find({ sale: sale.id }).populate('product');
  res.json({ sale, items });
}

export async function listSales(req: Request, res: Response) {
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '20', 10);
  const skip = (page - 1) * limit;
  const filter = req.query as any;
  const [items, total] = await saleService.listSales(filter, skip, limit);
  res.json({ data: items, total, page, pages: Math.ceil(total / limit) });
}
