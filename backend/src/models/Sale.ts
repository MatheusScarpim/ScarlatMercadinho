import { Schema, model, Document, Types } from 'mongoose';

export type SaleOrigin = 'KIOSK' | 'ADMIN_PANEL';
export type SaleStatus = 'OPEN' | 'COMPLETED' | 'CANCELED';

export interface SaleDocument extends Document {
  origin: SaleOrigin;
  status: SaleStatus;
  location?: string;
  totalItems: number;
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  paymentMethod?: string;
  apartmentNote?: string;
  notes?: string;
  createdAt: Date;
  completedAt?: Date;
  canceledAt?: Date;
}

const saleSchema = new Schema(
  {
    origin: { type: String, enum: ['KIOSK', 'ADMIN_PANEL'], default: 'KIOSK' },
    status: { type: String, enum: ['OPEN', 'COMPLETED', 'CANCELED'], default: 'OPEN' },
    location: { type: String, default: 'default' },
    totalItems: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    paymentMethod: { type: String },
    apartmentNote: { type: String },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    canceledAt: { type: Date }
  },
  { timestamps: true }
);

export const SaleModel = model<SaleDocument>('Sale', saleSchema);
