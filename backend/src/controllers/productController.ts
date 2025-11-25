import { Request, Response } from 'express';
import { ProductModel } from '../models/Product';
import * as productService from '../services/productService';

export async function createProduct(req: Request, res: Response) {
  const category = (req.body.category?._id as string) || (req.body.category as string);

  if (!category || (typeof category === 'string' && !category.trim())) {
    return res.status(400).json({ message: 'Campo category é obrigatório.' });
  }

  const product = await ProductModel.create({ ...req.body, category });
  res.status(201).json(product);
}

export async function listProducts(req: Request, res: Response) {
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '20', 10);
  const skip = (page - 1) * limit;
  const filterQuery = { ...req.query } as any;
  delete filterQuery.page;
  delete filterQuery.limit;
  const location = typeof req.query.location === 'string' ? req.query.location : undefined;

  const [items, total] = await Promise.all([
    productService.searchProducts(filterQuery, skip, limit, location),
    productService.countProducts(filterQuery)
  ]);
  res.json({ data: items, total, page, pages: Math.ceil(total / limit) });
}

export async function getProduct(req: Request, res: Response) {
  const product = await ProductModel.findById(req.params.id).populate('category mainSupplier');
  if (!product) return res.status(404).json({ message: 'Not found' });
  res.json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const product = await ProductModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!product) return res.status(404).json({ message: 'Not found' });
  res.json(product);
}

export async function deleteProduct(req: Request, res: Response) {
  const product = await ProductModel.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!product) return res.status(404).json({ message: 'Not found' });
  res.json(product);
}

export async function findByBarcode(req: Request, res: Response) {
  const location = typeof req.query.location === 'string' ? req.query.location : undefined;
  const product = await productService.findByBarcode(req.params.barcode, location);
  if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
  res.json(product);
}
