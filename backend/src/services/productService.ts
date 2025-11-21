import { FilterQuery } from 'mongoose';
import { ProductModel } from '../models/Product';

export async function searchProducts(params: { search?: string; category?: string; active?: string }, skip = 0, limit = 0) {
  const filter: FilterQuery<any> = {};
  if (params.search) {
    filter.$or = [
      { name: { $regex: params.search, $options: 'i' } },
      { barcode: params.search },
      { sku: params.search }
    ];
  }
  if (params.category) filter.category = params.category;
  if (params.active !== undefined) filter.active = params.active === 'true';
  return ProductModel.find(filter).skip(skip).limit(limit).populate('unit category mainSupplier');
}

export async function findByBarcode(barcode: string) {
  return ProductModel.findOne({ barcode, active: true }).populate('unit category');
}

export async function countProducts(params: { search?: string; category?: string; active?: string }) {
  const filter: FilterQuery<any> = {};
  if (params.search) {
    filter.$or = [
      { name: { $regex: params.search, $options: 'i' } },
      { barcode: params.search },
      { sku: params.search }
    ];
  }
  if (params.category) filter.category = params.category;
  if (params.active !== undefined) filter.active = params.active === 'true';
  return ProductModel.countDocuments(filter);
}
