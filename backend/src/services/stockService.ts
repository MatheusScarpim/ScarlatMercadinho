import { Types } from 'mongoose';
import { ProductModel } from '../models/Product';
import { StockMovementModel } from '../models/StockMovement';
import { notifyLowStock } from './notificationService';

async function computeCurrentStock(productId: Types.ObjectId | string, location: string) {
  const rows = await StockMovementModel.aggregate([
    { $match: { product: new Types.ObjectId(productId), location } },
    {
      $group: {
        _id: '$product',
        quantity: {
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ['$type', 'ENTRY'] }, then: '$quantity' },
                { case: { $eq: ['$type', 'EXIT'] }, then: { $multiply: [-1, '$quantity'] } },
                { case: { $eq: ['$type', 'ADJUSTMENT'] }, then: '$quantity' }
              ],
              default: 0
            }
          }
        }
      }
    }
  ]);
  return rows[0]?.quantity || 0;
}

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
  const { productId, type } = input;
  const location = (input.location || 'default').toString();
  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity)) {
    throw new Error('Quantidade inválida para movimentação de estoque');
  }

  const product = await ProductModel.findById(productId);
  if (!product) throw new Error('Product not found for stock movement');

  if (!Array.isArray(product.stockByLocation)) {
    product.stockByLocation = [];
  }

  const stockEntry =
    product.stockByLocation.find((s: any) => s.location === location) ||
    (() => {
      const entry = { location, quantity: 0 };
      (product.stockByLocation as any).push(entry);
      return entry as any;
    })();

  if (type === 'ENTRY') {
    stockEntry.quantity = Number(stockEntry.quantity || 0) + quantity;
  } else if (type === 'EXIT') {
    stockEntry.quantity = Number(stockEntry.quantity || 0) - quantity;
  } else if (type === 'ADJUSTMENT') {
    stockEntry.quantity = quantity;
  }

  product.markModified('stockByLocation');
  product.stockQuantity = (product.stockByLocation as any).reduce(
    (sum: number, s: any) => sum + Number(s.quantity || 0),
    0
  );
  await product.save();
  await ProductModel.updateOne(
    { _id: productId },
    { stockByLocation: product.stockByLocation, stockQuantity: product.stockQuantity }
  );

  if ((type === 'EXIT' || type === 'ADJUSTMENT') && product.stockQuantity <= product.minimumStock) {
    try {
      await notifyLowStock(product._id, product.name, product.stockQuantity, product.minimumStock);
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

export async function transferStock(input: {
  productId: Types.ObjectId | string;
  from: string;
  to: string;
  quantity: number;
  userId?: Types.ObjectId | string;
  reason?: string;
}) {
  const qty = Number(input.quantity);
  if (!input.productId) throw new Error('productId is required');
  if (!input.from || !input.to) throw new Error('from and to locations are required');
  if (input.from === input.to) throw new Error('Origem e destino devem ser diferentes');
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('Quantidade deve ser maior que zero');

  const product = await ProductModel.findById(input.productId);
  if (!product) throw new Error('Produto não encontrado');

  const available = await computeCurrentStock(product._id, input.from);
  if (available < qty) {
    throw new Error('Estoque insuficiente na origem');
  }

  const reason = input.reason || 'TRANSFERENCIA ENTRE LOCAIS';

  const exitMovement = await registerMovement({
    productId: input.productId,
    type: 'EXIT',
    quantity: qty,
    reason,
    location: input.from,
    userId: input.userId
  });

  const entryMovement = await registerMovement({
    productId: input.productId,
    type: 'ENTRY',
    quantity: qty,
    reason,
    location: input.to,
    userId: input.userId
  });

  return { exitMovement, entryMovement };
}
