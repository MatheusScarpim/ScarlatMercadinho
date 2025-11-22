import { FilterQuery } from 'mongoose';
import { ProductModel } from '../models/Product';

function buildFilter(params: { search?: string; category?: string; active?: string }) {
  const filter: FilterQuery<any> = {};
  if (params.search) {
    filter.$or = [
      { name: { $regex: params.search, $options: 'i' } },
      { barcode: params.search },
      { sku: params.search }
    ];
  }
  if (params.category) filter.category = params.category;
  if (params.active !== undefined && params.active !== '') filter.active = params.active === 'true';
  return filter;
}

function applyLocation(doc: any, location?: string) {
  if (!location) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  const locEntry = (obj.stockByLocation || []).find((s: any) => s.location === location);
  const qty = locEntry ? locEntry.quantity : 0;
  return { ...obj, stockQuantity: qty };
}

export async function searchProducts(
  params: { search?: string; category?: string; active?: string },
  skip = 0,
  limit = 0,
  location?: string
) {
  const filter = buildFilter(params);
  const docs = await ProductModel.find(filter).skip(skip).limit(limit).populate('unit category mainSupplier');
  return location ? docs.map((d) => applyLocation(d, location)) : docs;
}

export async function findByBarcode(barcode: string, location?: string) {
  const doc = await ProductModel.findOne({ barcode, active: true }).populate('unit category');
  return location && doc ? applyLocation(doc, location) : doc;
}

export async function countProducts(params: { search?: string; category?: string; active?: string }) {
  const filter = buildFilter(params);
  return ProductModel.countDocuments(filter);
}
