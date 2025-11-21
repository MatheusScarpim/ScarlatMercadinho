import { Types } from 'mongoose';
import { ProductModel } from '../models/Product';
import { StockMovementModel } from '../models/StockMovement';
import { notifyLowStock } from './notificationService';

export async function registerMovement(input: {
  productId: Types.ObjectId | string;
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  relatedPurchase?: Types.ObjectId | string;
  relatedSale?: Types.ObjectId | string;
  userId?: Types.ObjectId | string;
}) {
  const { productId, type, quantity } = input;
  const product = await ProductModel.findById(productId);
  if (!product) throw new Error('Product not found for stock movement');
  // Apply stock change: ADJUSTMENT expects quantity to be new stock equivalent
  if (type === 'ENTRY') {
    product.stockQuantity += quantity;
  } else if (type === 'EXIT') {
    product.stockQuantity -= quantity;
  } else if (type === 'ADJUSTMENT') {
    product.stockQuantity = quantity;
  }
  await product.save();

  // Verificar se estoque está baixo após EXIT ou ADJUSTMENT
  if ((type === 'EXIT' || type === 'ADJUSTMENT') && product.stockQuantity <= product.minimumStock) {
    // Criar notificação de estoque baixo
    await notifyLowStock(
      product._id,
      product.name,
      product.stockQuantity,
      product.minimumStock
    );
  }

  return StockMovementModel.create({
    product: productId,
    type,
    quantity,
    reason: input.reason,
    relatedPurchase: input.relatedPurchase,
    relatedSale: input.relatedSale,
    user: input.userId
  });
}
