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

  const previousStock = product.stockQuantity;

  // Atualiza o cache desnormalizado em UMA única operação atômica (pipeline update).
  // Cria o elemento do local se não existir, ajusta a quantidade e recalcula o total no servidor,
  // evitando tanto lost updates (vendas simultâneas) quanto a criação duplicada do mesmo local.
  const isAdjustment = type === 'ADJUSTMENT';
  const delta = type === 'ENTRY' ? quantity : type === 'EXIT' ? -quantity : quantity;
  await ProductModel.updateOne({ _id: productId }, [
    {
      $set: {
        stockByLocation: {
          $cond: [
            { $in: [location, { $ifNull: ['$stockByLocation.location', []] }] },
            {
              $map: {
                input: '$stockByLocation',
                as: 'e',
                in: {
                  $cond: [
                    { $eq: ['$$e.location', location] },
                    {
                      location: '$$e.location',
                      quantity: isAdjustment ? quantity : { $add: ['$$e.quantity', delta] }
                    },
                    '$$e'
                  ]
                }
              }
            },
            {
              $concatArrays: [
                { $ifNull: ['$stockByLocation', []] },
                [{ location, quantity: isAdjustment ? quantity : delta }]
              ]
            }
          ]
        }
      }
    },
    { $set: { stockQuantity: { $sum: '$stockByLocation.quantity' } } }
  ]);

  if (type === 'EXIT' || type === 'ADJUSTMENT') {
    const fresh = await ProductModel.findById(productId).select('name stockQuantity minimumStock');
    // Notifica apenas quando o estoque CRUZA o mínimo (acima -> no/abaixo), evitando
    // disparar uma notificação a cada venda enquanto já está abaixo do mínimo.
    const crossedBelow =
      !!fresh && previousStock > fresh.minimumStock && fresh.stockQuantity <= fresh.minimumStock;
    if (fresh && crossedBelow) {
      try {
        await notifyLowStock(fresh._id, fresh.name, fresh.stockQuantity, fresh.minimumStock);
        console.log(`[NOTIFICATION] Low stock notification created for product ${fresh.name}`);
      } catch (error) {
        console.error('[NOTIFICATION ERROR] Failed to create low stock notification:', error);
      }
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

  let entryMovement;
  try {
    entryMovement = await registerMovement({
      productId: input.productId,
      type: 'ENTRY',
      quantity: qty,
      reason,
      location: input.to,
      userId: input.userId
    });
  } catch (err) {
    // O ENTRY no destino falhou após o EXIT já ter sido aplicado: compensa
    // devolvendo a quantidade à origem para não "sumir" estoque.
    try {
      await registerMovement({
        productId: input.productId,
        type: 'ENTRY',
        quantity: qty,
        reason: `${reason} (ESTORNO - falha no destino)`,
        location: input.from,
        userId: input.userId
      });
    } catch (compErr) {
      console.error('[STOCK] Falha ao compensar transferência na origem:', compErr);
    }
    throw err;
  }

  return { exitMovement, entryMovement };
}
