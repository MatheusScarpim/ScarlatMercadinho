import { Request, Response } from 'express';
import * as notificationService from '../services/notificationService';
import { NotificationType } from '../models/Notification';
import { Types } from 'mongoose';

/**
 * Lista todas as notificações com filtros opcionais
 * Query params: read (boolean), type (NotificationType), limit (number)
 */
export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const { read, type, limit } = req.query;

    const filters: any = {};

    if (read !== undefined) {
      filters.read = read === 'true';
    }

    if (type) {
      filters.type = type as NotificationType;
    }

    if (limit) {
      filters.limit = parseInt(limit as string, 10);
    }

    const notifications = await notificationService.listNotifications(filters);

    res.json(notifications);
  } catch (error) {
    console.error('Error listing notifications:', error);
    res.status(500).json({ message: 'Error listing notifications' });
  }
};

/**
 * Retorna a contagem de notificações não lidas
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const count = await notificationService.getUnreadCount();
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Error getting unread count' });
  }
};

/**
 * Marca uma notificação específica como lida
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = await notificationService.markAsRead(id);

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
};

/**
 * Marca todas as notificações como lidas
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await notificationService.markAllAsRead();
    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error marking all notifications as read' });
  }
};

/**
 * Deleta notificações antigas
 * Query param: days (number, default: 30)
 */
export const deleteOld = async (req: Request, res: Response): Promise<void> => {
  try {
    const { days } = req.query;
    const daysOld = days ? parseInt(days as string, 10) : 30;

    const result = await notificationService.deleteOldNotifications(daysOld);

    res.json({
      message: `Deleted notifications older than ${daysOld} days`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting old notifications:', error);
    res.status(500).json({ message: 'Error deleting old notifications' });
  }
};

/**
 * Deleta todas as notificações
 */
export const deleteAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { Notification } = await import('../models/Notification');
    const result = await Notification.deleteMany({});

    res.json({
      message: 'All notifications deleted',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ message: 'Error deleting all notifications' });
  }
};

/**
 * Endpoint de teste para criar uma notificação de venda
 * Útil para debug e verificar se o sistema de notificações está funcionando
 */
export const testSaleNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const notification = await notificationService.notifySaleCompleted(
      new Types.ObjectId(),
      150.50,
      5,
      'PIX'
    );

    res.json({
      message: 'Test notification created successfully',
      notification,
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      message: 'Error creating test notification',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
