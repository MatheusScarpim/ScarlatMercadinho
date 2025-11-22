import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType = 'SALE_COMPLETED' | 'LOW_STOCK' | 'PURCHASE_REGISTERED' | 'SYSTEM_ALERT';

export interface NotificationDocument extends Document {
  type: NotificationType;
  title: string;
  message: string;
  relatedSale?: Types.ObjectId;
  relatedPurchase?: Types.ObjectId;
  relatedProduct?: Types.ObjectId;
  location?: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    type: {
      type: String,
      enum: ['SALE_COMPLETED', 'LOW_STOCK', 'PURCHASE_REGISTERED', 'SYSTEM_ALERT'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedSale: {
      type: Schema.Types.ObjectId,
      ref: 'Sale',
    },
    relatedPurchase: {
      type: Schema.Types.ObjectId,
      ref: 'Purchase',
    },
    relatedProduct: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
    },
    location: {
      type: String,
      default: 'default',
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Índice para buscar notificações não lidas rapidamente
notificationSchema.index({ read: 1, createdAt: -1 });

export const Notification = model<NotificationDocument>('Notification', notificationSchema);
