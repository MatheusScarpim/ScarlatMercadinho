import { Types } from 'mongoose';
import { ProductModel } from '../models/Product';
import { StockMovementModel } from '../models/StockMovement';
import { notifyLowStock } from './notificationService';

export async function registerMovement(input: {
  productId: Types.ObjectId | string;
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  location?: string;
  relatedPurchase?: Types.ObjectId | string;
  relatedSale?: Types.ObjectId | string;
  userId?: Types.ObjectId | string;
}) {
  const { productId, type, quantity } = input;
  const product = await ProductModel.findById(productId);
  if (!product) throw new Error('Product not found for stock movement');
  const location = input.location || 'default';
  const stockEntry =
    product.stockByLocation.find((s: any) => s.location === location) ||
    (() => {
      const entry = { location, quantity: 0 };
      (product.stockByLocation as any).push(entry);
      return entry as any;
    })();

  if (type === 'ENTRY') {
    stockEntry.quantity += quantity;
  } else if (type === 'EXIT') {
    stockEntry.quantity -= quantity;
  } else if (type === 'ADJUSTMENT') {
    stockEntry.quantity = quantity;
  }

  product.stockQuantity = (product.stockByLocation as any).reduce(
    (sum: number, s: any) => sum + s.quantity,
    0
  );
  await product.save();

  // Verificar se estoque está baixo após EXIT ou ADJUSTMENT
  if ((type === 'EXIT' || type === 'ADJUSTMENT') && product.stockQuantity <= product.minimumStock) {
    // Criar notificação de estoque baixo (não deve quebrar o fluxo se falhar)
    try {
      await notifyLowStock(
        product._id,
        product.name,
        product.stockQuantity,
        product.minimumStock
      );
      console.log(`[NOTIFICATION] Low stock notification created for product ${product.name}`);
    } catch (error) {
      console.error('[NOTIFICATION ERROR] Failed to create low stock notification:', error);
    }
  }

  return StockMovementModel.create({
    product: productId,
    type,
    quantity,
    reason: input.reason,
    relatedPurchase: input.relatedPurchase,
    relatedSale: input.relatedSale,
    user: input.userId,
    location
  });
}
