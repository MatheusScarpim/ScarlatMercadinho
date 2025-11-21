import { Notification, NotificationType } from '../models/Notification';
import { Types } from 'mongoose';

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  relatedSale?: Types.ObjectId | string;
  relatedPurchase?: Types.ObjectId | string;
  relatedProduct?: Types.ObjectId | string;
}

/**
 * Cria uma nova notificação para o admin
 */
export const createNotification = async (params: CreateNotificationParams) => {
  const notification = await Notification.create({
    type: params.type,
    title: params.title,
    message: params.message,
    relatedSale: params.relatedSale,
    relatedPurchase: params.relatedPurchase,
    relatedProduct: params.relatedProduct,
    read: false,
  });

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
 * Cria notificação específica para venda concluída
 */
export const notifySaleCompleted = async (
  saleId: Types.ObjectId | string,
  totalAmount: number,
  totalItems: number,
  paymentMethod: string
) => {
  return createNotification({
    type: 'SALE_COMPLETED',
    title: 'Nova Venda Concluída',
    message: `Uma venda de R$ ${totalAmount.toFixed(2)} foi concluída com ${totalItems} item(ns). Método de pagamento: ${paymentMethod}.`,
    relatedSale: saleId,
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
