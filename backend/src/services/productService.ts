import { FilterQuery } from 'mongoose';
import { ProductModel } from '../models/Product';
import { getBestPriceForProduct } from './batchService';
import { StockMovementModel } from '../models/StockMovement';
import { fetchCosmosProduct } from './cosmosService';
import { getMarginPercent } from './settingsService';
import { notifyProductAutoCreated } from './notificationService';

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

function applyLocation(doc: any, location?: string, stockOverride?: number) {
  if (!location) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  const qty = Number.isFinite(stockOverride) ? (stockOverride as number) : (() => {
    const locEntry = (obj.stockByLocation || []).find((s: any) => s.location === location);
    return locEntry ? locEntry.quantity : 0;
  })();
  return { ...obj, stockQuantity: qty };
}

async function computeStockByLocation(productIds: any[], location: string) {
  if (!productIds.length) return new Map<string, number>();

  const match: any = { product: { $in: productIds } };
  if (location) match.location = location;

  const movements = await StockMovementModel.find(match)
    .select('product type quantity location createdAt')
    .sort({ createdAt: 1 })
    .lean();

  const bucket = new Map<string, number>();
  for (const m of movements) {
    const id = m.product?.toString?.();
    if (!id) continue;
    const current = bucket.get(id) || 0;
    if (m.type === 'ENTRY') {
      bucket.set(id, current + Number(m.quantity || 0));
    } else if (m.type === 'EXIT') {
      bucket.set(id, current - Number(m.quantity || 0));
    } else if (m.type === 'ADJUSTMENT') {
      bucket.set(id, Number(m.quantity || 0));
    }
  }

  return bucket;
}

export async function searchProducts(
  params: { search?: string; category?: string; active?: string },
  skip = 0,
  limit = 0,
  location?: string
) {
  const filter = buildFilter(params);
  const docs = await ProductModel.find(filter).skip(skip).limit(limit).populate('category mainSupplier');

  if (!location) return docs;

  const stockMap = await computeStockByLocation(
    docs.map((d) => d._id),
    location
  );

  return docs.map((d) => applyLocation(d, location, stockMap.get(d._id.toString())));
}

export async function findByBarcode(barcode: string, location?: string) {
  let doc = await ProductModel.findOne({ barcode, active: true }).populate('category');
  let autoCreated = false;

  if (!doc) {
    // Produto não existe – busca via Cosmos (OpenAI) e cria automaticamente
    try {
      console.log('[PRODUCT-SERVICE] Produto não encontrado, buscando via Cosmos:', barcode);
      const cosmosResult = await fetchCosmosProduct(barcode);

      // Aplica margem (taxa) ao preço médio encontrado
      const marginPercent = await getMarginPercent();
      const averagePrice = Number(cosmosResult.averagePrice ?? 0);
      const marginMultiplier = 1 + marginPercent / 100;
      const salePriceWithMargin = averagePrice > 0 ? Math.round(averagePrice * marginMultiplier * 100) / 100 : 0;

      // Atualiza o preço do produto recém-criado com a margem aplicada
      const created = await ProductModel.findOne({ barcode }).populate('category');
      if (created) {
        if (salePriceWithMargin > 0) {
          created.salePrice = salePriceWithMargin;
          await created.save();
        }

        // Dispara notificação para o admin
        await notifyProductAutoCreated(
          created._id,
          created.name,
          barcode,
          salePriceWithMargin > 0 ? salePriceWithMargin : averagePrice,
          averagePrice,
          marginPercent
        );

        doc = await ProductModel.findById(created._id).populate('category');
        autoCreated = true;
        console.log('[PRODUCT-SERVICE] Produto auto-criado:', created.name, '| Preço:', salePriceWithMargin);
      }
    } catch (err: any) {
      console.error('[PRODUCT-SERVICE] Erro ao auto-criar produto via Cosmos:', err?.message);
    }
  }

  if (!doc) return null;

  // Aplica quantidade de estoque por localização
  let stockOverride: number | undefined;
  if (location) {
    const stockMap = await computeStockByLocation([doc._id], location);
    stockOverride = stockMap.get(doc._id.toString());
  }

  const productWithLocation = location
    ? applyLocation(doc, location, stockOverride)
    : doc.toObject ? doc.toObject() : doc;

  // Busca preço de lote com desconto (se houver)
  if (location) {
    try {
      const batchPriceInfo = await getBestPriceForProduct(doc._id, location);
      return {
        ...productWithLocation,
        batchPrice: batchPriceInfo.price,
        batchOriginalPrice: batchPriceInfo.originalPrice,
        batchDiscount: batchPriceInfo.discountPercent,
        batchExpiryDate: batchPriceInfo.expiryDate,
        hasBatch: batchPriceInfo.hasBatch,
        salePrice: batchPriceInfo.hasBatch ? batchPriceInfo.price : productWithLocation.salePrice,
        autoCreated,
      };
    } catch (error) {
      console.error('[PRODUCT-SERVICE] Erro ao buscar preço de lote:', error);
      return { ...productWithLocation, autoCreated };
    }
  }

  return { ...productWithLocation, autoCreated };
}

export async function countProducts(params: { search?: string; category?: string; active?: string }) {
  const filter = buildFilter(params);
  return ProductModel.countDocuments(filter);
}
