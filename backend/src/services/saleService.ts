import { Types } from 'mongoose';
import { SaleItemModel } from '../models/SaleItem';
import { SaleModel, SaleStatus } from '../models/Sale';
import { ProductModel } from '../models/Product';
import { registerMovement } from './stockService';
import { notifySaleCompleted } from './notificationService';
import { ApiError } from '../utils/apiError';

export async function createSale(origin: 'KIOSK' | 'ADMIN_PANEL' = 'KIOSK', location: string = 'default') {
  return SaleModel.create({
    origin,
    status: 'OPEN',
    location,
    totalItems: 0,
    subtotal: 0,
    discountTotal: 0,
    totalAmount: 0
  });
}

async function recalcTotals(saleId: string) {
  const items = await SaleItemModel.find({ sale: saleId });
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discountTotal = items.reduce((sum, i) => sum + i.discount, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.total, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  await SaleModel.findByIdAndUpdate(saleId, { subtotal, discountTotal, totalAmount, totalItems });
  return { subtotal, discountTotal, totalAmount, totalItems };
}

export async function addItem(
  saleId: string,
  payload: { productId: string; quantity: number; discount?: number; weight?: number; location?: string }
) {
  const sale = await SaleModel.findById(saleId);
  if (!sale || sale.status !== 'OPEN') throw new ApiError(400, 'Sale not open');
  const product = await ProductModel.findById(payload.productId);
  if (!product) throw new ApiError(404, 'Product not found');
  const location = sale.location || payload.location;

  // aplica melhor preço considerando lote/desconto
  let unitPrice = product.salePrice;
  let autoDiscount = 0;
  try {
    if (location) {
      const { getBestPriceForProduct } = await import('./batchService');
      const batchPriceInfo = await getBestPriceForProduct(product._id, location);
      unitPrice = batchPriceInfo.hasBatch ? batchPriceInfo.price : product.salePrice;
      // Não aplicamos desconto extra ao total: preço do lote já está em unitPrice.
    }
  } catch (err) {
    console.error('[SALE] Erro ao calcular preco com lote:', err);
  }

  const existing = await SaleItemModel.findOne({ sale: saleId, product: payload.productId });
  if (existing) {
    existing.quantity += payload.quantity;
    const rawDiscount = payload.discount ?? existing.discount ?? 0;
    const maxDiscount = existing.quantity * unitPrice;
    existing.discount = Math.min(Math.max(rawDiscount || 0, 0), maxDiscount);
    existing.unitPrice = unitPrice;
    existing.total = Math.max(0, existing.quantity * existing.unitPrice - (existing.discount || 0));
    if (payload.weight) existing.weight = (existing.weight || 0) + payload.weight;
    await existing.save();
    const totals = await recalcTotals(saleId);
    return { item: existing, totals };
  } else {
    const rawDiscount = payload.discount ?? 0;
    const maxDiscount = payload.quantity * unitPrice;
    const discount = Math.min(rawDiscount || 0, maxDiscount);
    const total = Math.max(0, unitPrice * payload.quantity - discount);
    const item = await SaleItemModel.create({
      sale: saleId,
      product: product.id,
      quantity: payload.quantity,
      unitPrice,
      discount,
      total,
      isWeighed: product.isWeighed,
      weight: payload.weight
    });
    const totals = await recalcTotals(saleId);
    return { item, totals };
  }
}

export async function updateItem(saleId: string, itemId: string, payload: { quantity: number; discount?: number }) {
  const sale = await SaleModel.findById(saleId);
  if (!sale || sale.status !== 'OPEN') throw new ApiError(400, 'Sale not open');
  const item = await SaleItemModel.findById(itemId);
  if (!item) throw new ApiError(404, 'Item not found');
  item.quantity = payload.quantity;
  const maxDiscount = item.quantity * item.unitPrice;
  const rawDiscount = payload.discount ?? item.discount ?? 0;
  item.discount = Math.min(Math.max(rawDiscount, 0), maxDiscount);
  item.total = Math.max(0, item.quantity * item.unitPrice - item.discount);
  await item.save();
  const totals = await recalcTotals(saleId);
  return { item, totals };
}

export async function sanitizeSaleItems(saleId: string) {
  const items = await SaleItemModel.find({ sale: saleId });
  let changed = false;
  for (const item of items) {
    const maxDiscount = item.quantity * item.unitPrice;
    const newDiscount = Math.min(Math.max(item.discount || 0, 0), maxDiscount);
    const newTotal = Math.max(0, item.quantity * item.unitPrice - newDiscount);
    if (newDiscount !== item.discount || newTotal !== item.total) {
      item.discount = newDiscount;
      item.total = newTotal;
      await item.save();
      changed = true;
    }
  }
  const totals = await recalcTotals(saleId);
  return { items, totals, changed };
}

export async function removeItem(saleId: string, itemId: string) {
  const sale = await SaleModel.findById(saleId);
  if (!sale || sale.status !== 'OPEN') throw new ApiError(400, 'Sale not open');
  await SaleItemModel.findByIdAndDelete(itemId);
  return recalcTotals(saleId);
}

export async function completeSale(saleId: string, data: { paymentMethod: string; apartmentNote?: string; notes?: string }) {
  const sale = await SaleModel.findById(saleId);
  if (!sale || sale.status !== 'OPEN') throw new ApiError(400, 'Sale not open');
  const items = await SaleItemModel.find({ sale: saleId });
  for (const item of items) {
    await registerMovement({
      productId: item.product,
      type: 'EXIT',
      quantity: item.quantity,
      reason: 'VENDA AUTOATENDIMENTO',
      relatedSale: sale._id,
      location: sale.location || 'default'
    });
  }
  sale.status = 'COMPLETED';
  sale.paymentMethod = data.paymentMethod;
  sale.apartmentNote = data.apartmentNote;
  sale.notes = data.notes;
  sale.completedAt = new Date();
  await sale.save();

  // Criar notificação para o admin (não deve quebrar o fluxo se falhar)
  try {
    await notifySaleCompleted(
      sale._id,
      sale.totalAmount,
      sale.totalItems,
      data.paymentMethod,
      sale.location
    );
    console.log(`[NOTIFICATION] Sale completed notification created for sale ${sale._id}`);
  } catch (error) {
    console.error('[NOTIFICATION ERROR] Failed to create sale notification:', error);
  }

  return sale;
}

export async function cancelSale(saleId: string) {
  const sale = await SaleModel.findById(saleId);
  if (!sale) throw new ApiError(404, 'Sale not found');
  if (sale.status === 'COMPLETED') {
    // We could optionally add entry adjustments to revert stock. Keep as comment for operator decision.
    console.warn('Sale already completed. Consider manual stock adjustment if needed.');
  }
  sale.status = 'CANCELED';
  sale.canceledAt = new Date();
  await sale.save();
  return sale;
}

export async function setCustomer(
  saleId: string,
  data: { cpf?: string; phone?: string; email?: string }
) {
  const sale = await SaleModel.findById(saleId);
  if (!sale || sale.status !== 'OPEN') throw new ApiError(400, 'Sale not open');
  sale.customer = {
    cpf: data.cpf || undefined,
    phone: data.phone || undefined,
    email: data.email || undefined
  };
  await sale.save();
  return sale;
}

export async function listSales(filter: { from?: string; to?: string }, skip = 0, limit = 0) {
  const query: any = {};
  if (filter.from || filter.to) {
    query.createdAt = {};
    if (filter.from) query.createdAt.$gte = new Date(filter.from);
    if (filter.to) query.createdAt.$lte = new Date(filter.to);
  }
  const [items, total] = await Promise.all([
    SaleModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    SaleModel.countDocuments(query)
  ]);
  return [items, total] as const;
}
