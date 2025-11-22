import { Notification, NotificationType } from '../models/Notification';
import { Types } from 'mongoose';

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  relatedSale?: Types.ObjectId | string;
  relatedPurchase?: Types.ObjectId | string;
  relatedProduct?: Types.ObjectId | string;
  location?: string;
}

/**
 * Cria uma nova notificação para o admin
 */
export const createNotification = async (params: CreateNotificationParams) => {
  console.log('[NOTIFICATION] Creating notification:', {
    type: params.type,
    title: params.title,
    relatedSale: params.relatedSale,
    relatedPurchase: params.relatedPurchase,
    relatedProduct: params.relatedProduct,
  });

  const notification = await Notification.create({
    type: params.type,
    title: params.title,
    message: params.message,
    relatedSale: params.relatedSale,
    relatedPurchase: params.relatedPurchase,
    relatedProduct: params.relatedProduct,
    location: params.location,
    read: false,
  });

  console.log('[NOTIFICATION] Notification created successfully:', notification._id);
  return notification;
};

/**
 * Lista todas as notificações com filtros opcionais
 */
export const listNotifications = async (filters: {
  read?: boolean;
  type?: NotificationType;
  limit?: number;
}) => {
  const query: any = {};

  if (filters.read !== undefined) {
    query.read = filters.read;
  }

  if (filters.type) {
    query.type = filters.type;
  }

  const notifications = await Notification.find(query)
    .populate('relatedSale')
    .populate('relatedPurchase')
    .populate('relatedProduct')
    .sort({ createdAt: -1 })
    .limit(filters.limit || 50);

  return notifications;
};

/**
 * Marca uma notificação como lida
 */
export const markAsRead = async (notificationId: string) => {
  const notification = await Notification.findByIdAndUpdate(
    notificationId,
    {
      read: true,
      readAt: new Date(),
    },
    { new: true }
  );

  return notification;
};

/**
 * Marca todas as notificações como lidas
 */
export const markAllAsRead = async () => {
  const result = await Notification.updateMany(
    { read: false },
    {
      read: true,
      readAt: new Date(),
    }
  );

  return result;
};

/**
 * Retorna a contagem de notificações não lidas
 */
export const getUnreadCount = async () => {
  const count = await Notification.countDocuments({ read: false });
  return count;
};

/**
 * Deleta notificações antigas (mais de X dias)
 */
export const deleteOldNotifications = async (daysOld: number = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await Notification.deleteMany({
    createdAt: { $lt: cutoffDate },
  });

  return result;
};

/**
 * Traduz métodos de pagamento para português
 */
const translatePaymentMethod = (method: string): string => {
  const translations: Record<string, string> = {
    'CREDIT_CARD': 'Cartão de Crédito',
    'DEBIT_CARD': 'Cartão de Débito',
    'PIX': 'PIX',
    'CASH': 'Dinheiro',
    'VOUCHER': 'Voucher'
  };

  return translations[method] || method;
};

/**
 * Cria notificação específica para venda concluída
 */
export const notifySaleCompleted = async (
  saleId: Types.ObjectId | string,
  totalAmount: number,
  totalItems: number,
  paymentMethod: string,
  location?: string
) => {
  const paymentMethodTranslated = translatePaymentMethod(paymentMethod);

  return createNotification({
    type: 'SALE_COMPLETED',
    title: 'Nova Venda Concluída',
    message: `Venda de R$ ${totalAmount.toFixed(2)} concluída com ${totalItems} item(ns). Pagamento: ${paymentMethodTranslated}. Local: ${location || 'default'}.`,
    relatedSale: saleId,
    location,
  });
};

/**
 * Cria notificação para estoque baixo
 */
export const notifyLowStock = async (
  productId: Types.ObjectId | string,
  productName: string,
  currentStock: number,
  minimumStock: number
) => {
  return createNotification({
    type: 'LOW_STOCK',
    title: 'Estoque Baixo',
    message: `O produto "${productName}" está com estoque baixo (${currentStock}/${minimumStock}).`,
    relatedProduct: productId,
  });
};

/**
 * Cria notificação para compra registrada
 */
export const notifyPurchaseRegistered = async (
  purchaseId: Types.ObjectId | string,
  supplierName: string,
  totalAmount: number
) => {
  return createNotification({
    type: 'PURCHASE_REGISTERED',
    title: 'Nova Compra Registrada',
    message: `Compra de R$ ${totalAmount.toFixed(2)} registrada do fornecedor ${supplierName}.`,
    relatedPurchase: purchaseId,
  });
};
