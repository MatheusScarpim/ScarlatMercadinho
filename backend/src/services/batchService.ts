import { BatchModel } from '../models/Batch';
import { ProductModel } from '../models/Product';
import { Types } from 'mongoose';

/**
 * Cria ou atualiza um lote para um produto
 */
export async function createOrUpdateBatch(data: {
  productId: Types.ObjectId | string;
  location: string;
  batchCode?: string | null;
  quantity: number;
  expiryDate: Date | null;
  purchasePrice: number;
  purchaseId?: Types.ObjectId | string;
}) {
  // Se não tem data de validade, não cria lote
  if (!data.expiryDate) {
    return null;
  }

  const productId = typeof data.productId === 'string' ? new Types.ObjectId(data.productId) : data.productId;
  const batchCode = data.batchCode?.trim?.() || null;

  // Busca o produto para pegar o preço de venda
  const product = await ProductModel.findById(productId);
  if (!product) {
    throw new Error('Produto não encontrado');
  }

  // Busca lote existente com mesmo código (se fornecido) ou mesma data e localização
  const existingBatch = await BatchModel.findOne(
    batchCode
      ? { product: productId, location: data.location, batchCode }
      : { product: productId, location: data.location, expiryDate: data.expiryDate }
  );

  if (existingBatch) {
    // Atualiza quantidade do lote existente
    existingBatch.quantity += data.quantity;
    if (batchCode) existingBatch.batchCode = batchCode;
    await existingBatch.save();
    return existingBatch;
  }

  // Cria novo lote com o preço de venda original do produto
  const batch = await BatchModel.create({
    product: productId,
    location: data.location,
    batchCode,
    quantity: data.quantity,
    expiryDate: data.expiryDate,
    purchasePrice: data.purchasePrice, // Custo de compra
    originalSalePrice: product.salePrice, // Preço de venda original
    currentPrice: product.salePrice, // Inicialmente igual ao preço de venda
    purchaseId: data.purchaseId
  });

  return batch;
}

/**
 * Reduz quantidade de um lote específico (venda FIFO)
 */
export async function consumeBatch(
  productId: Types.ObjectId | string,
  location: string,
  quantity: number
) {
  const prodId = typeof productId === 'string' ? new Types.ObjectId(productId) : productId;

  // Busca lotes disponíveis ordenados por data de validade (FIFO)
  const batches = await BatchModel.find({
    product: prodId,
    location,
    quantity: { $gt: 0 }
  }).sort({ expiryDate: 1 });

  let remaining = quantity;
  const consumedBatches: Array<{ batchId: Types.ObjectId; quantity: number; price: number }> = [];

  for (const batch of batches) {
    if (remaining <= 0) break;

    const toConsume = Math.min(remaining, batch.quantity);
    batch.quantity -= toConsume;
    await batch.save();

    consumedBatches.push({
      batchId: batch._id,
      quantity: toConsume,
      price: batch.currentPrice
    });

    remaining -= toConsume;

    // Remove lote se quantidade zerou
    if (batch.quantity === 0) {
      await BatchModel.deleteOne({ _id: batch._id });
    }
  }

  return consumedBatches;
}

/**
 * Busca lotes próximos do vencimento
 */
export async function getExpiringBatches(daysThreshold: number = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  const batches = await BatchModel.find({
    expiryDate: { $lte: thresholdDate },
    quantity: { $gt: 0 }
  })
    .populate('product')
    .sort({ expiryDate: 1 })
    .lean();

  return batches;
}

/**
 * Atualiza preços de todos os lotes baseado em vencimento
 */
export async function updateAllBatchPrices() {
  const batches = await BatchModel.find({ quantity: { $gt: 0 } });

  for (const batch of batches) {
    // O pre-save hook calculará o desconto e atualizará o preço
    await batch.save();
  }

  return batches.length;
}

/**
 * Obtém o melhor preço de venda para um produto em uma localização
 */
export async function getBestPriceForProduct(
  productId: Types.ObjectId | string,
  location: string
) {
  const prodId = typeof productId === 'string' ? new Types.ObjectId(productId) : productId;

  // Busca o lote mais próximo do vencimento (com maior desconto)
  const batch = await BatchModel.findOne({
    product: prodId,
    location,
    quantity: { $gt: 0 }
  }).sort({ expiryDate: 1 });

  if (batch) {
    return {
      price: batch.currentPrice,
      originalPrice: batch.originalSalePrice, // Preço original para mostrar ao cliente
      discountPercent: batch.discountPercent,
      expiryDate: batch.expiryDate,
      hasBatch: true
    };
  }

  // Se não tem lote, retorna preço normal do produto
  const product = await ProductModel.findById(prodId);
  return {
    price: product?.salePrice || 0,
    originalPrice: product?.salePrice || 0,
    discountPercent: 0,
    expiryDate: null,
    hasBatch: false
  };
}

/**
 * Lista todos os lotes de um produto
 */
export async function getProductBatches(
  productId: Types.ObjectId | string,
  location?: string
) {
  const prodId = typeof productId === 'string' ? new Types.ObjectId(productId) : productId;

  const filter: any = { product: prodId, quantity: { $gt: 0 } };
  if (location) {
    filter.location = location;
  }

  const batches = await BatchModel.find(filter)
    .sort({ expiryDate: 1 })
    .lean();

  return batches;
}

/**
 * Retorna a contagem de produtos críticos (≤3 dias para vencer)
 */
export async function getCriticalBatchesCount() {
  const criticalDate = new Date();
  criticalDate.setDate(criticalDate.getDate() + 3);

  const count = await BatchModel.countDocuments({
    expiryDate: { $lte: criticalDate },
    quantity: { $gt: 0 }
  });

  return count;
}

/**
 * Atualiza lotes antigos para adicionar originalSalePrice
 */
export async function migrateBatchesWithSalePrice() {
  const batchesWithoutSalePrice = await BatchModel.find({
    originalSalePrice: { $exists: false }
  }).populate('product');

  let updated = 0;
  for (const batch of batchesWithoutSalePrice) {
    const product = batch.product as any;
    if (product && product.salePrice) {
      batch.originalSalePrice = product.salePrice;
      await batch.save();
      updated++;
    }
  }

  return updated;
}

/**
 * Atualiza o desconto de um lote específico
 */
export async function updateBatchDiscountById(
  batchId: string,
  discountPercent: number
) {
  const batch = await BatchModel.findById(batchId).populate('product');

  if (!batch) {
    throw new Error('Lote não encontrado');
  }

  // Atualiza o desconto manualmente
  batch.discountPercent = discountPercent;

  // Marca como desconto manual (ou volta para automático se discount for 0)
  batch.manualDiscount = discountPercent > 0;

  // O pre-save hook irá calcular o currentPrice baseado no discountPercent
  await batch.save();
  return batch;
}
