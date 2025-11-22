import { PurchaseModel } from '../models/Purchase';
import { SupplierModel } from '../models/Supplier';
import { registerMovement } from './stockService';
import { notifyPurchaseRegistered } from './notificationService';
import { Types } from 'mongoose';

export async function createPurchase(data: {
  supplier: string;
  invoiceNumber?: string;
  issueDate: Date;
  arrivalDate: Date;
  items: { product: string; quantity: number; unitCost: number }[];
  notes?: string;
  createdBy: string;
  location?: string;
}) {
  const itemsWithTotal = data.items.map((item) => ({
    ...item,
    totalCost: item.quantity * item.unitCost
  }));
  const totalAmount = itemsWithTotal.reduce((sum, i) => sum + i.totalCost, 0);
  const purchase = await PurchaseModel.create({
    supplier: data.supplier,
    invoiceNumber: data.invoiceNumber,
    issueDate: data.issueDate,
    arrivalDate: data.arrivalDate,
    items: itemsWithTotal,
    totalAmount,
    notes: data.notes,
    createdBy: data.createdBy,
    location: data.location || 'default'
  });

  // Create stock movements for each item
  for (const item of purchase.items) {
    await registerMovement({
      productId: item.product as Types.ObjectId,
      type: 'ENTRY',
      quantity: item.quantity,
      reason: 'COMPRA FORNECEDOR',
      relatedPurchase: purchase._id,
      location: purchase.location || 'default'
    });
  }

  // Criar notificação para o admin (não deve quebrar o fluxo se falhar)
  try {
    const supplier = await SupplierModel.findById(data.supplier);
    if (supplier) {
      await notifyPurchaseRegistered(
        purchase._id,
        supplier.name,
        totalAmount
      );
      console.log(`[NOTIFICATION] Purchase registered notification created for purchase ${purchase._id}`);
    }
  } catch (error) {
    console.error('[NOTIFICATION ERROR] Failed to create purchase notification:', error);
  }

  return purchase;
}
