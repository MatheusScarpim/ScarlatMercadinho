import { PurchaseModel } from '../models/Purchase';
import { SupplierModel } from '../models/Supplier';
import { registerMovement } from './stockService';
import { notifyPurchaseRegistered } from './notificationService';
import { Types } from 'mongoose';
import { ProductModel } from '../models/Product';
import { getMarginPercent } from './settingsService';
import { CategoryModel } from '../models/Category';
import { GtinLookupModel } from '../models/GtinLookup';
import { createOrUpdateBatch } from './batchService';

const AUTO_CATEGORY_NAME = 'AUTOMATICO';

function cleanDigits(value?: string | null) {
  return (value || '').replace(/\D+/g, '');
}

async function ensureAutoCategory() {
  let cat = await CategoryModel.findOne({ name: AUTO_CATEGORY_NAME });
  if (!cat) {
    cat = await CategoryModel.create({ name: AUTO_CATEGORY_NAME, active: true });
  }
  return cat._id;
}

async function ensureProductForItem(item: {
  product?: string;
  name?: string;
  barcode?: string;
  unitCost: number;
  marginMultiplier: number;
  salePrice?: number;
}) {
  if (item.product) return item.product;
  const barcode = (item.barcode || '').trim();
  const name = (item.name || '').trim() || 'Produto sem nome';

  if (barcode) {
    const existingByBarcode = await ProductModel.findOne({ barcode });
    if (existingByBarcode) return existingByBarcode._id.toString();
  }

  const categoryId = await ensureAutoCategory();
  const defaultImage = barcode ? `https://cdn-cosmos.bluesoft.com.br/products/${barcode}` : null;
  const created = await ProductModel.create({
    name,
    description: name,
    barcode: barcode || `AUTO-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    category: categoryId,
    imageUrl: defaultImage,
    costPrice: item.unitCost,
    salePrice: Number(
      Number.isFinite(item.salePrice)
        ? (item.salePrice as number)
        : (item.unitCost * item.marginMultiplier).toFixed(2)
    ),
    stockQuantity: 0,
    stockByLocation: [],
    minimumStock: 0,
    active: true,
    isWeighed: false,
  });

  return created._id.toString();
}

async function ensureSupplier(input: { supplier?: string; name?: string; cnpj?: string; address?: string }) {
  if (input.supplier) return input.supplier;

  const cleanCnpj = cleanDigits(input.cnpj);
  if (cleanCnpj) {
    const existingByCnpj = await SupplierModel.findOne({ cnpj: cleanCnpj });
    if (existingByCnpj) return existingByCnpj._id.toString();
  }

  const name = input.name?.trim() || 'FORNECEDOR AUTOMATICO';
  const created = await SupplierModel.create({
    name,
    cnpj: cleanCnpj || undefined,
    address: input.address ? { street: input.address } : undefined,
    active: true,
  });
  return created._id.toString();
}

export async function createPurchase(data: {
  supplier?: string;
  supplierName?: string;
  supplierCnpj?: string;
  supplierAddress?: string;
  invoiceNumber?: string;
  issueDate: Date;
  arrivalDate: Date;
  items: {
    product?: string;
    name?: string;
    barcode?: string;
    quantity: number;
    unitCost: number;
    salePrice?: number;
    batchCode?: string;
    expiryDate?: Date | null;
  }[];
  notes?: string;
  createdBy: string;
  location?: string;
}) {
  if (!data.location) {
    throw new Error('Campo location Ǹ obrigat��rio para registrar compra.');
  }

  const supplierId = await ensureSupplier({
    supplier: data.supplier,
    name: data.supplierName,
    cnpj: data.supplierCnpj,
    address: data.supplierAddress,
  });

  const marginPercent = await getMarginPercent();
  const multiplier = 1 + marginPercent / 100;

  const itemsWithTotal = [];
  for (const item of data.items) {
    const totalCost = item.quantity * item.unitCost;
    const normalizedSale = Number.isFinite(Number(item.salePrice)) ? Number(item.salePrice) : undefined;
    const productId = await ensureProductForItem({
      product: item.product,
      name: item.name,
      barcode: item.barcode,
      unitCost: item.unitCost,
      marginMultiplier: multiplier,
      salePrice: normalizedSale,
    });
    itemsWithTotal.push({
      ...item,
      product: productId,
      totalCost,
      salePrice: normalizedSale,
      batchCode: item.batchCode,
      expiryDate: item.expiryDate || null,
    });

    const product = await ProductModel.findById(productId);
    if (product) {
      product.costPrice = item.unitCost;
      const saleValue = Number.isFinite(normalizedSale)
        ? (normalizedSale as number)
        : Number((item.unitCost * multiplier).toFixed(2));
      product.salePrice = saleValue;
      await product.save();
    }
  }

  const totalAmount = itemsWithTotal.reduce((sum, i) => sum + i.totalCost, 0);
  const purchase = await PurchaseModel.create({
    supplier: supplierId,
    invoiceNumber: data.invoiceNumber,
    issueDate: data.issueDate,
    arrivalDate: data.arrivalDate,
    items: itemsWithTotal,
    totalAmount,
    notes: data.notes,
    createdBy: data.createdBy,
    location: data.location,
  });

  for (const item of purchase.items) {
    await registerMovement({
      productId: item.product as Types.ObjectId,
      type: 'ENTRY',
      quantity: item.quantity,
      reason: 'COMPRA FORNECEDOR',
      relatedPurchase: purchase._id,
      location: purchase.location,
    });

    // Cria lote se houver data de validade
    if (item.expiryDate) {
      await createOrUpdateBatch({
        productId: item.product as Types.ObjectId,
        location: purchase.location,
        quantity: item.quantity,
        batchCode: item.batchCode,
        expiryDate: item.expiryDate,
        purchasePrice: item.unitCost,
        purchaseId: purchase._id
      });
    }
  }

  try {
    const supplier = await SupplierModel.findById(supplierId);
    if (supplier) {
      await notifyPurchaseRegistered(purchase._id, supplier.name, totalAmount);
      console.log(`[NOTIFICATION] Purchase registered notification created for purchase ${purchase._id}`);
    }
  } catch (error) {
    console.error('[NOTIFICATION ERROR] Failed to create purchase notification:', error);
  }

  return purchase;
}

export async function getPurchasesWithDetails() {
  const purchases = await PurchaseModel.find()
    .populate('supplier')
    .populate({
      path: 'items.product',
      model: 'Product'
    })
    .sort({ createdAt: -1 })
    .lean();

  const result = [];
  for (const purchase of purchases) {
    const itemsWithImages = [];
    for (const item of purchase.items) {
      let imageUrl = null;
      if (item.product && typeof item.product === 'object' && 'barcode' in item.product) {
        const gtinLookup = await GtinLookupModel.findOne({ ean: item.product.barcode }).lean();
        imageUrl = gtinLookup?.imageUrl || null;
      }
      itemsWithImages.push({
        ...item,
        imageUrl
      });
    }
    result.push({
      ...purchase,
      items: itemsWithImages
    });
  }

  return result;
}
