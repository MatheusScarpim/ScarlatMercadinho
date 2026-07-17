import { Request, Response } from 'express';
import { ProductModel } from '../models/Product';
import * as productService from '../services/productService';

export async function createProduct(req: Request, res: Response) {
  const category = (req.body.category?._id as string) || (req.body.category as string);

  if (!category || (typeof category === 'string' && !category.trim())) {
    return res.status(400).json({ message: 'Campo category é obrigatório.' });
  }

  // Sempre usar imagem do Cosmos CDN baseada no barcode
  const barcode = req.body.barcode as string | undefined;
  const imageUrl = barcode
    ? `https://cdn-cosmos.bluesoft.com.br/products/${barcode}`
    : req.body.imageUrl || null;

  const product = await ProductModel.create({ ...req.body, category, imageUrl });
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
  const product = await ProductModel.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Not found' });
  res.json({ success: true, id: req.params.id });
}

export async function findByBarcode(req: Request, res: Response) {
  const location = typeof req.query.location === 'string' ? req.query.location : undefined;
  const product = await productService.findByBarcode(req.params.barcode, location);
  if (!product) return res.status(404).json({ message: 'Produto não encontrado' });
  res.json(product);
}

export async function listPriceOutliers(req: Request, res: Response) {
  const filter = (req.query.filter as string) || 'all'; // all | above | below | ok | no_data | reviewed
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const location = typeof req.query.location === 'string' ? req.query.location.trim() : '';

  const query: any = { active: true };
  if (category && category !== 'all') query.category = category;
  // Filtra por loja: produto precisa ter estoque cadastrado na localização (code)
  if (location && location !== 'all') query['stockByLocation.location'] = location;

  const products = await ProductModel.find(query).populate('category').lean();

  // Monta o objeto completo de cada produto (com status calculado)
  const scoped = products.map((p) => {
    const sale = p.salePrice;
    let min = p.minPrice ?? null;
    let avg = p.avgPrice ?? null;
    let max = p.maxPrice ?? null;

    // Sanitizar: se o valor é mais de 3x o salePrice, é dado de atacado/caixa
    if (sale > 0) {
      const teto = sale * 3;
      if (min && min > teto) min = null;
      if (avg && avg > teto) avg = null;
      if (max && max > teto) max = null;
    }

    const hasRange = min !== null || max !== null;

    let status: 'ok' | 'above' | 'below' | 'no_data' = 'ok';
    if (!hasRange) {
      status = 'no_data';
    } else if (max !== null && sale > max) {
      status = 'above';
    } else if (min !== null && min > 0 && sale < min) {
      status = 'below';
    }

    return {
      _id: p._id,
      name: p.name,
      barcode: p.barcode,
      imageUrl: p.imageUrl,
      category: p.category,
      salePrice: sale,
      costPrice: p.costPrice,
      minPrice: min,
      avgPrice: avg,
      maxPrice: max,
      status,
      reviewed: p.priceReviewed === true,
      diffPercent:
        status === 'above' && max
          ? Math.round(((sale - max) / max) * 100)
          : status === 'below' && min
            ? Math.round(((min - sale) / min) * 100)
            : 0,
    };
  });

  // Itens revisados ficam separados; as views por status só mostram não revisados.
  const pending = scoped.filter((r) => !r.reviewed);

  let results: typeof scoped;
  if (filter === 'reviewed') {
    results = scoped.filter((r) => r.reviewed);
  } else if (filter === 'all') {
    results = pending;
  } else {
    results = pending.filter((r) => r.status === filter);
  }

  // Ordena: problemas primeiro (above/below), depois no_data, depois ok
  const order: Record<string, number> = { above: 0, below: 1, no_data: 2, ok: 3 };
  results.sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4));

  const summary = {
    total: pending.length,
    above: pending.filter((r) => r.status === 'above').length,
    below: pending.filter((r) => r.status === 'below').length,
    ok: pending.filter((r) => r.status === 'ok').length,
    noData: pending.filter((r) => r.status === 'no_data').length,
    reviewed: scoped.filter((r) => r.reviewed).length,
  };

  res.json({ summary, items: results });
}

export async function setPriceReviewed(req: Request, res: Response) {
  const reviewed = req.body?.reviewed !== false; // default true
  const product = await ProductModel.findByIdAndUpdate(
    req.params.id,
    { priceReviewed: reviewed, priceReviewedAt: reviewed ? new Date() : null },
    { new: true }
  );
  if (!product) return res.status(404).json({ message: 'Not found' });
  res.json({ _id: product._id, priceReviewed: product.priceReviewed, priceReviewedAt: product.priceReviewedAt });
}
